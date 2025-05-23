{{- range . }}
  {{- if (gt (len .Vulnerabilities) 0) }}
| Package | CVE | Severity | Description |
| :------ | :-: | :------: | :---------- |
    {{- range .Vulnerabilities }}    
| {{ escapeXML .PkgName }} | [{{ escapeXML .VulnerabilityID }}]({{ escapeXML .PrimaryURL }}) | {{ escapeXML .Vulnerability.Severity }} | {{ escapeXML .Description}} |
    {{- end }}
  {{- end }}
{{- end }}
