/**
 * @fileOverview Disallow the use of specific jQuery methods.
 */
'use strict';

const { get } = require('../utils/get');

function getMessage(blackListName) {
  return `The use of ${blackListName} method has been deprecated.`;
}

function isJQueryCaller(node, name = null) {
  let oName = get(node, 'object.callee.object.name') === 'Ember';
  let pName = get(node, 'object.callee.property.name') === '$';
  let cName = get(node, 'object.callee.name') === '$';
  let lName = get(node, 'object.name') === name;

  return oName || pName || cName || lName;
}

function getLocalImportName(node, sourceName) {
  if (get(node, 'source.value').includes(sourceName)) {
    return get(node, 'specifiers').map((specifier) => specifier.local.name);
  }

  return [];
}

module.exports = {
  docs: {
    category: 'Best Practices',
    recommended: true
  },
  meta: {
    message: getMessage
  },
  create(context) {
    const BLACKLIST = context.options[0] || [];
    let jQueryLocalName = null;
    let varDecIDName = null;

    return {

      ImportDeclaration(node) {
        let localName = getLocalImportName(node, 'jquery');
        if (localName.length > 0) {
          jQueryLocalName = localName[0];
        }
      },

      VariableDeclarator(node) {
        varDecIDName = get(node, 'id.name');
        jQueryLocalName = jQueryLocalName === get(node, 'init.name') ? varDecIDName : null;
      },

      MemberExpression(node) {
        let propertyName = get(node, 'property.name');
        let blackListName = BLACKLIST.includes(propertyName) ? propertyName : false;
        let isThisExpression = get(node, 'object.type').includes('ThisExpression');

        jQueryLocalName = isThisExpression && propertyName.includes('$') ? varDecIDName : jQueryLocalName;

        if (!isThisExpression && blackListName && isJQueryCaller(node, jQueryLocalName)) {
          context.report({ node: node.property, message: getMessage(blackListName) });
        }
      }
    };
  }
};
