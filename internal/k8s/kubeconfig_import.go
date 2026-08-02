package k8s

import (
	"fmt"
	"os"
	"path/filepath"

	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/util/homedir"
)

// MergeKubeconfig parses yamlBytes as a kubeconfig, merges any new contexts /
// clusters / users into the active kubeconfig file on disk, and returns the
// names of the contexts that were actually added (skipping ones that already
// existed). Only the single-file mode (kubeconfigPath) is supported; multi-dir
// / multi-env callers get an error.
func MergeKubeconfig(yamlBytes []byte) ([]string, error) {
	clientMu.RLock()
	mode := kubeconfigMode
	dstPath := kubeconfigPath
	clientMu.RUnlock()

	if mode != "single" && mode != "" {
		return nil, fmt.Errorf("import is only supported when Radar is running in single-kubeconfig mode (current mode: %s)", mode)
	}

	if dstPath == "" {
		if home := homedir.HomeDir(); home != "" {
			dstPath = filepath.Join(home, ".kube", "config")
		}
	}
	if dstPath == "" {
		return nil, fmt.Errorf("cannot determine kubeconfig path")
	}

	incoming, err := clientcmd.Load(yamlBytes)
	if err != nil {
		return nil, fmt.Errorf("invalid kubeconfig: %w", err)
	}
	if len(incoming.Contexts) == 0 {
		return nil, fmt.Errorf("kubeconfig contains no contexts")
	}

	var existing *clientcmdapi.Config
	if _, statErr := os.Stat(dstPath); statErr == nil {
		existing, err = clientcmd.LoadFromFile(dstPath)
		if err != nil {
			return nil, fmt.Errorf("failed to load existing kubeconfig: %w", err)
		}
	} else {
		existing = clientcmdapi.NewConfig()
	}

	// Collect context names that are genuinely new.
	var added []string
	for name := range incoming.Contexts {
		if _, exists := existing.Contexts[name]; !exists {
			added = append(added, name)
		}
	}

	// Merge: incoming wins for any key that doesn't yet exist; existing wins
	// for keys that do (non-destructive import).
	for name, ctx := range incoming.Contexts {
		if _, exists := existing.Contexts[name]; !exists {
			existing.Contexts[name] = ctx
		}
	}
	for name, cl := range incoming.Clusters {
		if _, exists := existing.Clusters[name]; !exists {
			existing.Clusters[name] = cl
		}
	}
	for name, au := range incoming.AuthInfos {
		if _, exists := existing.AuthInfos[name]; !exists {
			existing.AuthInfos[name] = au
		}
	}

	if err := clientcmd.WriteToFile(*existing, dstPath); err != nil {
		return nil, fmt.Errorf("failed to write kubeconfig: %w", err)
	}

	return added, nil
}
