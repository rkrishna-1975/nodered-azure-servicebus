

function Utils() {

}

Utils.prototype.stringFromUTF8Array = function (data) {
  const extraByteMap = [1, 1, 1, 1, 2, 2, 3, 0];
  var count = data.length;
  var str = "";

  for (var index = 0; index < count;) {
    var ch = data[index++];
    if (ch & 0x80) {
      var extra = extraByteMap[(ch >> 3) & 0x07];
      if (!(ch & 0x40) || !extra || ((index + extra) > count))
        return null;

      ch = ch & (0x3F >> extra);
      for (; extra > 0; extra -= 1) {
        var chx = data[index++];
        if ((chx & 0xC0) != 0x80)
          return null;

        ch = (ch << 6) | (chx & 0x3F);
      }
    }

    str += String.fromCharCode(ch);
  }

  return str;
}


Utils.prototype.convertMessageBody = function (message) {
  var returnValue = null;
  console.log(message.body + " ==> " + (Object.prototype.toString.call(message.body)));
  if (message.body instanceof Buffer) {
    returnValue = message.body.toString();
  } else {
    returnValue = message.body
  }
  return returnValue;
}


Utils.prototype.retry = async (fn, args, retrySeconds, scope) => {

  console.log("Received a retry call for " + fn.name + " in " + retrySeconds + "s");
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log("Retrying " + fn.name);
  fn.apply(scope,args);
}


module.exports = Utils;

