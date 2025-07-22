import { ChartOpts } from '@pulumi/kubernetes/helm/v3';

export function helmChart(
  repo: string,
  chart: string,
  version: string,
): Pick<ChartOpts, 'chart' | 'version' | 'fetchOpts'> & { repo: string } {
  return {
    chart,
    version,
    repo,
    fetchOpts: {
      repo,
    },
  };
}
