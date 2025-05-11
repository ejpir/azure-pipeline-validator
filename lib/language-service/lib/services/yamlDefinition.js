/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.YAMLDefinition = void 0;
var path = require("path");
var vscode_languageserver_types_1 = require("vscode-languageserver-types");
var vscode_uri_1 = require("vscode-uri");
var jsonParser_1 = require("../parser/jsonParser");
var YAMLDefinition = /** @class */ (function () {
    function YAMLDefinition(promiseConstructor) {
        this.promise = promiseConstructor || Promise;
    }
    YAMLDefinition.prototype.doDefinition = function (document, position, yamlDocument, workspaceRoot) {
        var offset = document.offsetAt(position);
        var jsonDocument = yamlDocument.documents.length > 0 ? yamlDocument.documents[0] : null;
        if (jsonDocument === null) {
            return this.promise.resolve(void 0);
        }
        var node = jsonDocument.getNodeFromOffset(offset);
        // can only jump to definition for template declaration, which means:
        // * we must be on a string node that is acting as a value (vs a key)
        // * the key (location) must be "template"
        //
        // In other words...
        // - template: my_cool_template.yml
        //             ^^^^^^^^^^^^^^^^^^^^ this part
        if (!(node instanceof jsonParser_1.StringASTNode) || node.location !== 'template' || node.isKey) {
            return this.promise.resolve(void 0);
        }
        var _a = node
            .value
            .split('@'), location = _a[0], resource = _a[1];
        // cannot jump to external resources
        if (resource && resource !== 'self') {
            return this.promise.resolve(void 0);
        }
        // Azure Pipelines accepts both forward and back slashes as path separators,
        // even when running on non-Windows.
        // To make things easier, normalize all path separators into this platform's path separator.
        // That way, vscode-uri will operate on the separators as expected.
        location = location
            .replaceAll(path.posix.sep, path.sep)
            .replaceAll(path.win32.sep, path.sep);
        // determine if abs path (from root) or relative path
        // NOTE: Location.create takes in a string, even though the parameter is called 'uri'.
        // So create an actual URI, then .toString() it and skip the unnecessary encoding.
        var definitionUri = '';
        if (location.startsWith(path.sep)) {
            if (workspaceRoot !== undefined) {
                // Substring to strip the leading separator.
                definitionUri = vscode_uri_1.Utils.joinPath(workspaceRoot, location.substring(1)).toString(true);
            }
            else {
                // Can't form an absolute path without a workspace root.
                return this.promise.resolve(void 0);
            }
        }
        else {
            definitionUri = vscode_uri_1.Utils.resolvePath(vscode_uri_1.Utils.dirname(vscode_uri_1.URI.parse(document.uri, true)), location).toString(true);
        }
        var definition = vscode_languageserver_types_1.Location.create(definitionUri, vscode_languageserver_types_1.Range.create(0, 0, 0, 0));
        return this.promise.resolve(definition);
    };
    return YAMLDefinition;
}());
exports.YAMLDefinition = YAMLDefinition;
//# sourceMappingURL=yamlDefinition.js.map