package projects

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strconv"
	"strings"

	amqp "github.com/rabbitmq/amqp091-go"
)

// SMTPConfig holds SMTP connection settings, populated from environment variables.
type SMTPConfig struct {
	Host        string
	Port        int
	User        string
	Password    string
	From        string
	FromName    string
	SSL         bool
	StartTLS    bool
}

// SMTPConfigFromEnv reads SMTP settings from environment variables.
func SMTPConfigFromEnv() SMTPConfig {
	port, _ := strconv.Atoi(os.Getenv("SMTP_PORT"))
	if port == 0 {
		port = 587
	}
	return SMTPConfig{
		Host:     os.Getenv("SMTP_HOST"),
		Port:     port,
		User:     os.Getenv("SMTP_USER"),
		Password: os.Getenv("SMTP_PASSWORD"),
		From:     os.Getenv("SMTP_FROM"),
		FromName: os.Getenv("SMTP_FROM_NAME"),
		SSL:      os.Getenv("SMTP_SSL") == "true",
		StartTLS: os.Getenv("SMTP_STARTTLS") != "false",
	}
}

func (c SMTPConfig) addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

func (c SMTPConfig) fromHeader() string {
	if c.FromName != "" {
		return fmt.Sprintf("%s <%s>", c.FromName, c.From)
	}
	return c.From
}

// Send delivers a plain-text email. Supports STARTTLS (default) and implicit SSL.
func (c SMTPConfig) Send(to, subject, body string) error {
	if c.Host == "" {
		return fmt.Errorf("email: SMTP_HOST not configured")
	}
	msg := strings.Join([]string{
		"From: " + c.fromHeader(),
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		body,
	}, "\r\n")

	var auth smtp.Auth
	if c.User != "" {
		auth = smtp.PlainAuth("", c.User, c.Password, c.Host)
	}

	if c.SSL {
		tlsCfg := &tls.Config{ServerName: c.Host}
		conn, err := tls.Dial("tcp", c.addr(), tlsCfg)
		if err != nil {
			return fmt.Errorf("email: tls dial: %w", err)
		}
		client, err := smtp.NewClient(conn, c.Host)
		if err != nil {
			return fmt.Errorf("email: smtp client: %w", err)
		}
		defer client.Close()
		if auth != nil {
			if err := client.Auth(auth); err != nil {
				return fmt.Errorf("email: auth: %w", err)
			}
		}
		if err := client.Mail(c.From); err != nil {
			return fmt.Errorf("email: MAIL FROM: %w", err)
		}
		if err := client.Rcpt(to); err != nil {
			return fmt.Errorf("email: RCPT TO: %w", err)
		}
		w, err := client.Data()
		if err != nil {
			return fmt.Errorf("email: DATA: %w", err)
		}
		defer w.Close()
		_, err = fmt.Fprint(w, msg)
		return err
	}

	return smtp.SendMail(c.addr(), auth, c.From, []string{to}, []byte(msg))
}

// StartInviteWorker consumes the invite queue and sends real SMTP emails.
// Runs until ctx is cancelled. Call in a goroutine.
func StartInviteWorker(ctx context.Context, amqpURL string, cfg SMTPConfig) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		log.Printf("[projects] invite worker: connect failed: %v", err)
		return
	}
	defer conn.Close()
	ch, err := conn.Channel()
	if err != nil {
		log.Printf("[projects] invite worker: channel failed: %v", err)
		return
	}
	defer ch.Close()

	msgs, err := ch.Consume(QueueInvites, "invite-mailer", false, false, false, false, nil)
	if err != nil {
		log.Printf("[projects] invite worker: consume failed: %v", err)
		return
	}

	log.Println("[projects] invite worker started")
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-msgs:
			if !ok {
				return
			}
			var payload struct {
				Email   string `json:"email"`
				Project string `json:"project"`
				Role    string `json:"role"`
			}
			if err := json.Unmarshal(msg.Body, &payload); err != nil {
				log.Printf("[projects] invite worker: bad message: %v", err)
				msg.Nack(false, false)
				continue
			}

			subject := fmt.Sprintf("You've been added to %s on Kube Center", payload.Project)
			body := inviteEmailBody(payload.Email, payload.Project, payload.Role)

			if err := cfg.Send(payload.Email, subject, body); err != nil {
				log.Printf("[projects] invite worker: send to %s failed: %v", payload.Email, err)
				msg.Nack(false, true) // requeue for retry
				continue
			}
			log.Printf("[projects] invite sent to %s (project=%s role=%s)", payload.Email, payload.Project, payload.Role)
			msg.Ack(false)
		}
	}
}

func inviteEmailBody(email, project, role string) string {
	roleLabel := map[string]string{
		"project_admin": "Project Admin",
		"member":        "Member",
		"viewer":        "Viewer",
	}[role]
	if roleLabel == "" {
		roleLabel = role
	}
	return fmt.Sprintf(`Hi %s,

You've been added to the "%s" project on Kube Center with the role: %s.

Log in to access your project:
  http://localhost:9280

What you can do:
  - Viewer: browse resources and logs
  - Member: also restart pods and deployments, open terminal
  - Project Admin: also manage project members

If you have any questions, contact your Kube Center administrator.

— Kube Center
`, email, project, roleLabel)
}
