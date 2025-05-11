/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Adam Voss. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.format = void 0;
var jsyaml = require("js-yaml");
var os_1 = require("os");
var vscode_languageserver_types_1 = require("vscode-languageserver-types");
function format(document, options, customTags) {
    var text = document.getText();
    var schemaWithAdditionalTags = jsyaml.Schema.create(customTags.map(function (tag) {
        var typeInfo = tag.split(' ');
        return new jsyaml.Type(typeInfo[0], { kind: typeInfo[1] || 'scalar' });
    }));
    //We need compiledTypeMap to be available from schemaWithAdditionalTags before we add the new custom properties
    customTags.map(function (tag) {
        var typeInfo = tag.split(' ');
        schemaWithAdditionalTags.compiledTypeMap[typeInfo[0]] = new jsyaml.Type(typeInfo[0], { kind: typeInfo[1] || 'scalar' });
    });
    var additionalOptions = {
        schema: schemaWithAdditionalTags
    };
    var documents = [];
    jsyaml.loadAll(text, function (doc) { return documents.push(doc); }, additionalOptions);
    var dumpOptions = { indent: options.tabSize, noCompatMode: true };
    var newText;
    if (documents.length == 1) {
        var yaml = documents[0];
        newText = jsyaml.safeDump(yaml, dumpOptions);
    }
    else {
        var formatted = documents.map(function (d) { return jsyaml.safeDump(d, dumpOptions); });
        newText = '%YAML 1.2' + os_1.EOL + '---' + os_1.EOL + formatted.join('...' + os_1.EOL + '---' + os_1.EOL) + '...' + os_1.EOL;
    }
    return [vscode_languageserver_types_1.TextEdit.replace(vscode_languageserver_types_1.Range.create(vscode_languageserver_types_1.Position.create(0, 0), document.positionAt(text.length)), newText)];
}
exports.format = format;
//# sourceMappingURL=yamlFormatter.js.map