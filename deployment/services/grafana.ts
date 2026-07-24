import { readdirSync, readFileSync } from 'fs';
import { join, parse } from 'path';
import * as pulumi from '@pulumi/pulumi';
import { oss } from '@pulumiverse/grafana';

const dashboardDirectory = join(__dirname, '../grafana-dashboards/');

/**
 * @param envName name of the stack (prod, staging, dev)
 * @param tableSuffix suffix for the table names (production, staging, dev)
 */
export function deployGrafana(envName: string, tableSuffix: string) {
  const availableFiles = readdirSync(dashboardDirectory).filter(f => f.endsWith('.json'));
  const folder = new oss.Folder('grafana-hive-folder', {
    title: `Hive Monitoring (${envName})`,
    uid: 'hive-monitoring',
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

    // Pin a stable uid from the filename so dashboard URLs survive redeploys
    configJson.uid = `hive-${identifier.toLowerCase().replace(/^hive-/, '')}`;
    delete configJson.id;
    delete configJson.version;

    return new oss.Dashboard(`dashboard-${identifier.toLowerCase()}`, {
      folder: folder.uid,
      configJson: JSON.stringify(configJson, null, 2),
    });
  });

  return {
    folder,
    dashboards,
  };
}
