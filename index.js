const path = require('path')
const { readFileSync, writeFileSync } = require('fs')
const glob = require('glob')
const toHtml = require('htmlparser-to-html');
const htmlparser = require("htmlparser");

module.exports = function (options) {
  if (!options || !options.srcBasePath && !options.srcPattern) {
    throw new Error('src needed')
  }

  const srcBasePath = options.srcBasePath
  const srcPattern = options.srcPattern
  const srcPath = `${srcBasePath}${srcPattern}`
  const distBasePath = options.distBasePath

  function changeNode (data) {
    if (data.type === 'comment' && data.raw.includes('#include') && data.raw.includes('file=')) {
      data.type = 'text'
      data.data = data.data.replace('#include', '')
      data.data = data.data.replace('file=', '${require(')
      data.data = data.data.replace(/$/, ')}')
      options.changes && options.changes.forEach((val) => {
        data.data = data.data.replace(val.from, val.to)
      })
      options.ignores && options.ignores.forEach((val) => {
        if (data.data.includes(val)) {
          data.data = ''
        }
      })
      data.raw = data.data
    }
  }

  var recFunc = function (childrenArr, deal) {
    childrenArr.forEach(function (arr) {
      deal(arr);
      if (arr.children) {
        recFunc(arr.children, changeNode)
      }
    })
  }

  const srcFiles = glob.sync(srcPath)
  srcFiles.forEach((fileName) => {
    let fileTailPath = fileName.slice(srcBasePath.length, -5)
    let code = readFileSync(fileName, 'utf-8')

    var rawHtml = code;
    var handler = new htmlparser.DefaultHandler(function (error, dom) {
      if (error) {
        console.log('error!')
      }
      else {
        recFunc(dom, changeNode)
        writeFileSync(`${distBasePath}${fileTailPath}.html`, toHtml(dom));
      }
        
    });
    var parser = new htmlparser.Parser(handler);
    parser.parseComplete(rawHtml);
  })

}