const fs = require('fs');
const yaml = require('js-yaml');

// Load YAML file
function loadYAML(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

// Generate CRD
function generateCRD(openApiData, propertiesData) {
  const plans = propertiesData.apiKeyEnabled
    ? {
        API_KEY: {
          name: "API Key plan",
          description: "API key plan needs a key to authenticate",
          security: {
            type: "API_KEY",
          },
        },
      }
    : {
        KeyLess: {
          name: "Free plan",
          description: "This plan does not require any authentication",
          security: {
            type: "KEY_LESS",
          },
        },
      };

  const crd = {
    apiVersion: "gravitee.io/v1alpha1",
    kind: "ApiV4Definition",
    metadata: {
      name: openApiData.info.title.toLowerCase().replace(/ /g, "-"),
      namespace: "default",
    },
    spec: {
      name: openApiData.info.title,
      description: openApiData.info.description,
      version: openApiData.info.version,
      type: "PROXY",
      definitionContext: {
        origin: "KUBERNETES",
        syncFrom: "MANAGEMENT"
      },
      contextRef: {
        name: propertiesData.environment,
        namespace: "default"
      },
      listeners: [
        {
          type: "HTTP",
          paths: [
            {
              path: propertiesData.entrypoint,
            },
          ],
          entrypoints: [
            {
              type: "http-proxy",
              qos: "AUTO",
            },
          ],
        },
      ],
      endpointGroups: [
        {
          name: "Default HTTP proxy group",
          type: "http-proxy",
          endpoints: [
            {
              name: "Default HTTP proxy",
              type: "http-proxy",
              inheritConfiguration: false,
              configuration: {
                target: propertiesData.endpoint,
              },
              secondary: false,
            },
          ],
        },
      ],
      flowExecution: {
        mode: "DEFAULT",
        matchRequired: false,
      },
      plans: plans,
    },
  };
  return yaml.dump(crd);
}

// Main function
function main() {
  const [,, openApiFilePath, propertiesFilePath] = process.argv;
  if (!openApiFilePath || !propertiesFilePath) {
    console.error("Please provide both OpenAPI and properties file paths.");
    return;
  }

  try {
    const openApiData = loadYAML(openApiFilePath);
    const propertiesData = loadYAML(propertiesFilePath);

    const crd = generateCRD(openApiData, propertiesData);
    fs.writeFileSync("gravitee-crd.yaml", crd);
    console.log("Generated CRD file: gravitee-crd.yaml");
  } catch (error) {
    console.error("Error generating CRD:", error);
  }
}

main();