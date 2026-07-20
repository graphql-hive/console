import { readdirSync, readFileSync } from 'fs';
import { join, parse } from 'path';
import { Dashboard, Folder } from '@lbrlabs/pulumi-grafana';
import * as pulumi from '@pulumi/pulumi';

const dashboardDirectory = join(__dirname, '../grafana-dashboards/');

/**
 * @param envName name of the stack (prod, staging, dev)
 * @param tableSuffix suffix for the table names (production, staging, dev)
 */
export function deployGrafana(envName: string, tableSuffix: string) {
  const availableFiles = readdirSync(dashboardDirectory)
    .filter(f => f.endsWith('.json'))
    // Temp workaround
    .filter(v => !v.includes('ClickHouse-Latency.json'));
  const folder = new Folder('grafana-hive-folder', {
    title: `Hive Monitoring (${envName})`,
  });

  const params = new pulumi.Config('grafanaDashboards').requireObject<Record<string, string>>(
    'params',
  );
  params['TABLE_SUFFIX'] = tableSuffix;
  params['PROM_DATASOURCE_UID'] = params['PROM_DATASOURCE_UID'] ?? 'grafanacloud-prom';
  params['TEMPO_DATASOURCE_UID'] = params['TEMPO_DATASOURCE_UID'] ?? 'grafanacloud-traces';

  const dashboards = availableFiles.map(filePath => {
    const fullPath = join(dashboardDirectory, filePath);
    const identifier = parse(fullPath).name;
    let configString = readFileSync(fullPath, 'utf8');

    for (const [key, value] of Object.entries(params)) {
      if (configString.includes(key)) {
        configString = configString.replace(new RegExp(key, 'g'), value);
      }
    }

    const configJson = JSON.parse(configString);

    // Preserve a pinned uid only for opted-in dashboards, so re-saves keep a stable
    // URL. Grafana 13's app platform mints a fresh uid on every re-save when none is
    // set. Don't un-strip globally: re-saving the other working dashboards on Grafana
    // 13 via this old provider is what churned Metric-Alerts.
    const preserveUid = new Set(['Metric-Alerts']); // matches `identifier` (filename)
    if ('uid' in configJson && !preserveUid.has(identifier)) {
      delete configJson.uid;
    }

    // Always strip version to avoid version-mismatch errors on update.
    if ('version' in configJson) {
      delete configJson.version;
    }

    return new Dashboard(`dashboard-${identifier.toLowerCase()}`, {
      folder: folder.id,
      configJson: JSON.stringify(configJson, null, 2),
    });
  });

  return {
    folder,
    dashboards,
  };
}
