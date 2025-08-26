{{- define "dytallix.fullname" -}}
{{- if .Chart.Name }}{{ .Chart.Name }}{{ end }}
{{- end }}

{{- define "dytallix.labels" -}}
app.kubernetes.io/name: {{ include "dytallix.fullname" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
app.kubernetes.io/managed-by: Helm
{{- end }}