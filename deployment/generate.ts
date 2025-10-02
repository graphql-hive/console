import { execSync } from 'child_process';
import { readFile, writeFile } from 'fs/promises';
import { compile } from 'json-schema-to-typescript';
import { fileSync } from 'tmp';
import { OTLP_COLLECTOR_CHART, VECTOR_HELM_CHART } from './utils/observability';
import { CONTOUR_CHART } from './utils/reverse-proxy';

async function generateJsonSchemaFromHelmValues(input: string) {
  const jsonSchemaTempFile = fileSync();
  execSync(`helm schema -input ${input} -output ${jsonSchemaTempFile.name}`);

  return await readFile(jsonSchemaTempFile.name, 'utf-8').then(r => JSON.parse(r));
}

async function generateOpenTelemetryCollectorTypes() {
  const jsonSchemaUrl = `https://raw.githubusercontent.com/open-telemetry/opentelemetry-helm-charts/opentelemetry-collector-${OTLP_COLLECTOR_CHART.version}/charts/opentelemetry-collector/values.schema.json`;
  const jsonSchema = await fetch(jsonSchemaUrl).then(res => res.json());
  const output = await compile(jsonSchema, 'OpenTelemetryCollectorValues', {
    additionalProperties: false,
  });
  await writeFile('./utils/opentelemetry-collector.types.ts', output);
}

async function generateVectorDevTypes() {
  const helmValuesFileUrl = `https://raw.githubusercontent.com/vectordotdev/helm-charts/vector-${VECTOR_HELM_CHART.version}/charts/vector/values.yaml`;
  const valuesFile = await fetch(helmValuesFileUrl).then(res => res.text());
  const valuesTempFile = fileSync();
  await writeFile(valuesTempFile.name, valuesFile);
  const jsonSchema = await generateJsonSchemaFromHelmValues(valuesTempFile.name);
  const output = await compile(jsonSchema, 'VectorValues', { additionalProperties: false });
  await writeFile('./utils/vector.types.ts', output);
}

async function generateContourTypes() {
  const helmValuesFileUrl = `https://raw.githubusercontent.com/bitnami/charts/contour/${CONTOUR_CHART.version}/bitnami/contour/values.yaml`;
  const valuesFile = await fetch(helmValuesFileUrl).then(r => r.text());

  const valuesTempFile = fileSync();
  await writeFile(valuesTempFile.name, valuesFile);
  const jsonSchema = await generateJsonSchemaFromHelmValues(valuesTempFile.name);
  const output = await compile(jsonSchema, 'ContourValues');
  await writeFile('./utils/contour.types.ts', output);
}

async function main() {
  await Promise.all([
    generateContourTypes(),
    generateVectorDevTypes(),
    generateOpenTelemetryCollectorTypes(),
  ]);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
