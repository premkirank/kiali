package pods

import (
	"github.com/kiali/kiali/services/models"
	"k8s.io/api/core/v1"
	"strings"
)

const SidecarContainerImage = "docker.io/istio/proxy"

type SidecarPresenceChecker struct {
	Pod *v1.Pod
}

// A Checker checks individual objects and builds an IstioCheck whenever the check fails.
// SidecarPresenceChecker checks if the current Pod has an Istio Sidecar installed.
func (checker SidecarPresenceChecker) Check() ([]*models.IstioCheck, bool) {
	for _, container := range checker.Pod.Spec.Containers {
		if strings.HasPrefix(container.Image, SidecarContainerImage) {
			return []*models.IstioCheck{}, true
		}
	}

	check := models.BuildCheck("Pod has no Istio sidecar", "warning", "")
	return []*models.IstioCheck{&check}, false
}
