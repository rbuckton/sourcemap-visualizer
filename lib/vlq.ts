/// <reference path="node.d.ts" />
var base64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var base64encoder: number[] = [];
var base64decoder: number[] = [];
for (var i = 0; i < base64chars.length; i++) {
    base64decoder[base64chars.charCodeAt(i)] = i;
    base64encoder[i] = base64chars.charCodeAt(i);
}

export function encode(buffer: number[]): string {
  var parts: string[] = [];
  for (var i = 0; i < buffer.length; i++) {
    var data = buffer[i];
    var unsigned = data < 0 ? (-data << 1) + 1 : data << 1;
    do {
      var part = unsigned & 31;
      unsigned >>>= 5;
      if (unsigned > 0) {
        part |= 32;
      }
      parts.push(base64chars.charAt(part));
    } while (unsigned > 0);
  }
  return parts.join("");
}

export function decode(text: string): number[] {
  var buffer: number[] = [];
  var value = 0;
  var shift = 0;
  for (var i = 0; i < text.length; i++) {
    var part = base64chars.indexOf(text.charAt(i));
    value += (part & 31) << shift;
    shift += 5;
    if ((part & 32) === 0) {
      if (value & 1) {
        buffer.push(-(value >>> 1));
      } else {
        buffer.push(value >>> 1);
      }
      shift = 0;
      value = 0;
    }
  }
  return buffer;
}

export function decodeChars(text: string, start: number, end: number): number[] {
    if (start < 0) start = 0;
    if (end > text.length) end = text.length;
    var buffer: number[] = [];
    var value = 0;
    var shift = 0;
    for (var i = start; i < end; i++) {
        var part = base64decoder[text.charCodeAt(i)];
        value += (part & 31) << shift;
        shift += 5;
        if ((part & 32) === 0) {
            if (value & 1) {
                buffer.push(-(value >>> 1));
            } else {
                buffer.push(value >>> 1);
            }
            shift = 0;
            value = 0;
        }
    }
    return buffer;
}