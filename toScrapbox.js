'use strict'
var NO_LINE_BREAK = false
var SOFT_LINE_BREAK = true

function toSimpleText (node, noFormatting) {
  if (node.type === 'img') {
    if (node.href) {
      return '[' + node.href + ' ' + node.src + ']'
    }
    return '[' + node.src + ']'
  }

  var before = ''
  if (node.bold) {
    before += '*'
  }
  if (node.enlarge) {
    before += (new Array(node.enlarge + 1)).join('*')
  }
  if (node.italic) {
    before += '/'
  }
  if (node.strike) {
    before += '-'
  }
  if (node.underline) {
    before += '_'
  }
  var content
  if (node.children) {
    content = node.children.map(toSimpleText).filter(Boolean).join(' ')
  } else {
    content = node.text || ''
  }
  var check = ''
  if (node.type === 'check') {
    check = (node.checked ? '✅' : '⬜') + ' '
  }
  var inner
  if (before !== '') {
    inner = check + '[' + before + ' ' + content + ']'
  } else {
    inner = check + content
  }

  if (node.href) {
    return '[' + node.href + ' ' + inner + ']'
  }
  return inner
}

function processList (node, line, indent) {
  if (!indent) {
    indent = ''
  }
  indent += '\t'
  var listAsText = node.children
    .map(function (listEntry, nr) {
      var children
      if (listEntry.children) {
        children = listEntry.children.concat()
      } else {
        children = [listEntry]
      }
      var lastEntry
      if (children[children.length - 1].type === 'list') {
        lastEntry = children.pop()
      }
      var data = toSimpleText({
        type: listEntry.type,
        checked: listEntry.checked,
        children: children
      })
      if (data !== '') {
        if (node.variant === 'ol') {
          data = indent + (nr + 1) + '. ' + data + '\n'
        } else {
          data = indent + data + '\n'
        }
      }
      if (lastEntry) {
        data = data + processList(lastEntry, null, indent) + '\n'
      }
      return data
    })
    .join('')
  return listAsText.substr(0, listAsText.length - 1)
}

var stringifier = {
  'link': function (node, line) {
    line.push(toSimpleText(node))
    return NO_LINE_BREAK
  },
  'list': processList,
  'hr': function (node, line) {
    return '[/icons/hr.icon]'
  },
  'div': function (node, line) {
    var result = []
    if (node.children) {
      result = stringifyNodes(node, result)
    }
    return result
  },
  'table': function (node, line) {
    return 'table:_\n' +
      node.children.map(function (row) {
        return '\t' + row.children.map(function (td) {
          return toSimpleText(td)
        }).join('\t')
      }).join('\n')
  },
  'code': function (node, line) {
    return 'code:_' +
      node.text.split('\n').map(function (codeLine) {
        return '\n\t' + codeLine.split(' ').join(' ')
      }).join('')
  },
  'img': function (node, line) {
    line.push(toSimpleText(node))
    return NO_LINE_BREAK
  },
  'br': function (node, line) {
    return SOFT_LINE_BREAK
  },
  'text': function (node, line) {
    if (node.blockquote) {
      return new Array(node.blockquote + 1).join('>') + ' ' + toSimpleText(node)
    }
    line.push(toSimpleText(node))
    return NO_LINE_BREAK
  }
}

function stringifyNode (child, line) {
  return stringifier[child.type](child, line)
}

function stringifyNodes (tokens, result) {
  var line = []
  tokens.children.forEach(function (child) {
    var block = stringifyNode(child, line)
    if (block === NO_LINE_BREAK) {
      return
    }
    if (line.length > 0) {
      result.push(line.join(' '))
      if (block !== SOFT_LINE_BREAK) {
        result.push('')
      }
      line = []
    }
    if (Array.isArray(block)) {
      result = result.concat(block)
    } else if (block !== SOFT_LINE_BREAK) {
      result.push(block)
      result.push('')
    }
  })
  if (line.length > 0) {
    result.push(line.join(' '))
  }
  return result
}

function toScrapbox (tokens) {
  var result = []
  result = stringifyNodes(tokens, result)
  if (tokens.tags) {
    result.push('')
    result.push(tokens.tags.map(function (tag) {
      return '#' + tag
    }).join(' '))
  }
  var formerWasEmpty = false
  result = result.filter(function removeMultipleLineBreaks (block) {
    if (block === '') {
      if (formerWasEmpty) {
        return false
      }
      formerWasEmpty = true
    } else {
      formerWasEmpty = false
    }
    return true
  })
  var last = result.length - 1
  while ((result[last] === '' || result[last] === null) && last > 0) {
    last -= 1
  }
  return {
    title: tokens.title,
    lines: result.slice(0, last + 1)
  }
}
toScrapbox.toSimpleText = toSimpleText

module.exports = toScrapbox
