var PIXEL_PER_INCH = 72;
var MM_PER_INCH = 25.4;
var PIXEL_PER_MM = PIXEL_PER_INCH / MM_PER_INCH;

module.exports = function getValue (property, unitsText) {
  unitsText = unitsText || 'millimeters';
  if (unitsText === 'mm') {
    unitsText = 'millimeters';
  }

  var value = property.value;
  if (property.unitsText === unitsText) return property.value;
  switch (property.unitsText) {
    case 'pixels':
      return Array.isArray(value) ? value.map(pixelToMillimeter) : pixelToMillimeter(value);
    //TODO: more types
    default:
      throw new Error('invalid unitsText ' + property.unitsText);
  }
};

module.exports.pixelToMillimeter = pixelToMillimeter;
function pixelToMillimeter (px) {
  return px / PIXEL_PER_MM;
}

module.exports.millimeterToPixel = millimeterToPixel;
function millimeterToPixel (mm) {
  return mm * PIXEL_PER_MM;
}
