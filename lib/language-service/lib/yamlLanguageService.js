"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanguageService = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var jsonSchemaService_1 = require("./services/jsonSchemaService");
var documentSymbols_1 = require("./services/documentSymbols");
var yamlCompletion_1 = require("./services/yamlCompletion");
var yamlHover_1 = require("./services/yamlHover");
var yamlDefinition_1 = require("./services/yamlDefinition");
var yamlValidation_1 = require("./services/yamlValidation");
var yamlFormatter_1 = require("./services/yamlFormatter");
var yamlTraversal_1 = require("./services/yamlTraversal");
function getLanguageService(schemaRequestService, contributions, customSchemaProvider, workspaceContext, promiseConstructor) {
    var promise = promiseConstructor || Promise;
    var schemaService = new jsonSchemaService_1.JSONSchemaService(schemaRequestService, workspaceContext, customSchemaProvider);
    var completer = new yamlCompletion_1.YAMLCompletion(schemaService, contributions, promise);
    var hover = new yamlHover_1.YAMLHover(schemaService, contributions, promise);
    var definition = new yamlDefinition_1.YAMLDefinition(promise);
    var yamlDocumentSymbols = new documentSymbols_1.YAMLDocumentSymbols();
    var yamlValidation = new yamlValidation_1.YAMLValidation(schemaService, promise);
    var yamlTraversal = new yamlTraversal_1.YAMLTraversal(promise);
    return {
        configure: function (settings) {
            schemaService.clearExternalSchemas();
            if (settings.schemas) {
                settings.schemas.forEach(function (schema) {
                    schemaService.registerExternalSchema(schema.uri, schema.fileMatch, schema.schema);
                });
            }
            yamlValidation.configure(settings);
            var customTagsSetting = settings && settings["customTags"] ? settings["customTags"] : [];
            completer.configure(customTagsSetting);
        },
        doComplete: completer.doComplete.bind(completer),
        doResolve: completer.doResolve.bind(completer),
        doValidation: yamlValidation.doValidation.bind(yamlValidation),
        doHover: hover.doHover.bind(hover),
        doDefinition: definition.doDefinition.bind(definition),
        findDocumentSymbols: yamlDocumentSymbols.findDocumentSymbols.bind(yamlDocumentSymbols),
        resetSchema: function (uri) { return schemaService.onResourceChange(uri); },
        doFormat: yamlFormatter_1.format,
        findNodes: yamlTraversal.findNodes.bind(yamlTraversal),
        getNodePropertyValues: yamlTraversal.getNodePropertyValues.bind(yamlTraversal)
    };
}
exports.getLanguageService = getLanguageService;
//# sourceMappingURL=yamlLanguageService.js.map