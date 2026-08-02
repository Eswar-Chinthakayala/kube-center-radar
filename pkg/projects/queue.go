package projects

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	ExchangeAudit  = "kc.audit"
	ExchangeNotify = "kc.notify"
	QueueAuditLog  = "kc.audit.log"
	QueueInvites   = "kc.notify.invites"
)

// Queue manages the RabbitMQ connection and channel for publishing events.
type Queue struct {
	conn *amqp.Connection
	ch   *amqp.Channel
}

// NewQueue connects to RabbitMQ, declares exchanges and queues, and returns a ready Queue.
func NewQueue(url string) (*Queue, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("projects: rabbitmq dial: %w", err)
	}
	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("projects: rabbitmq channel: %w", err)
	}
	q := &Queue{conn: conn, ch: ch}
	if err := q.declare(); err != nil {
		q.Close()
		return nil, err
	}
	return q, nil
}

func (q *Queue) declare() error {
	for _, ex := range []string{ExchangeAudit, ExchangeNotify} {
		if err := q.ch.ExchangeDeclare(ex, "direct", true, false, false, false, nil); err != nil {
			return fmt.Errorf("projects: declare exchange %s: %w", ex, err)
		}
	}
	queues := []struct{ name, exchange, key string }{
		{QueueAuditLog, ExchangeAudit, "log"},
		{QueueInvites, ExchangeNotify, "invite"},
	}
	for _, spec := range queues {
		if _, err := q.ch.QueueDeclare(spec.name, true, false, false, false, nil); err != nil {
			return fmt.Errorf("projects: declare queue %s: %w", spec.name, err)
		}
		if err := q.ch.QueueBind(spec.name, spec.key, spec.exchange, false, nil); err != nil {
			return fmt.Errorf("projects: bind queue %s: %w", spec.name, err)
		}
	}
	return nil
}

func (q *Queue) Close() {
	if q.ch != nil {
		q.ch.Close()
	}
	if q.conn != nil {
		q.conn.Close()
	}
}

// PublishAudit sends an audit event to the audit exchange asynchronously.
// Errors are logged but not returned — audit failures must never break the primary request.
func (q *Queue) PublishAudit(evt AuditEvent) {
	b, err := json.Marshal(evt)
	if err != nil {
		log.Printf("[projects] audit marshal error: %v", err)
		return
	}
	if err := q.ch.PublishWithContext(context.Background(),
		ExchangeAudit, "log", false, false,
		amqp.Publishing{ContentType: "application/json", Body: b, DeliveryMode: amqp.Persistent},
	); err != nil {
		log.Printf("[projects] audit publish error: %v", err)
	}
}

// PublishInvite queues a project invitation notification.
func (q *Queue) PublishInvite(email, projectName, role string) {
	payload := map[string]string{"email": email, "project": projectName, "role": role}
	b, _ := json.Marshal(payload)
	if err := q.ch.PublishWithContext(context.Background(),
		ExchangeNotify, "invite", false, false,
		amqp.Publishing{ContentType: "application/json", Body: b, DeliveryMode: amqp.Persistent},
	); err != nil {
		log.Printf("[projects] invite publish error: %v", err)
	}
}

// StartAuditWorker consumes the audit queue and writes events to Postgres.
// Runs until ctx is cancelled. Call in a goroutine.
func StartAuditWorker(ctx context.Context, amqpURL string, store *Store) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		log.Printf("[projects] audit worker: connect failed: %v", err)
		return
	}
	defer conn.Close()
	ch, err := conn.Channel()
	if err != nil {
		log.Printf("[projects] audit worker: channel failed: %v", err)
		return
	}
	defer ch.Close()

	msgs, err := ch.Consume(QueueAuditLog, "audit-writer", false, false, false, false, nil)
	if err != nil {
		log.Printf("[projects] audit worker: consume failed: %v", err)
		return
	}

	log.Println("[projects] audit worker started")
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-msgs:
			if !ok {
				return
			}
			var evt AuditEvent
			if err := json.Unmarshal(msg.Body, &evt); err != nil {
				log.Printf("[projects] audit worker: bad message: %v", err)
				msg.Nack(false, false)
				continue
			}
			refJSON, _ := json.Marshal(evt.ResourceRef)
			if err := store.WriteAuditEvent(ctx, evt, refJSON); err != nil {
				log.Printf("[projects] audit worker: write failed: %v", err)
				msg.Nack(false, true)
				continue
			}
			msg.Ack(false)
		}
	}
}
