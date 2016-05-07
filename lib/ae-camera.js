var getValue = require('./ae-value');
var pixelToMillimeter = getValue.pixelToMillimeter;
var FILM_WIDTH_MM = 36;

module.exports = function (composition, camera) {
  var compWidth = composition.width;
  // var compHeight = composition.height;
  // var Transform = camera.properties.Transform;
  var CamOpts = camera.properties['Camera Options'];
  // var hypot = Math.sqrt(compWidth * compWidth + compHeight * compHeight);

  // in pixels
  var zoomPx = getValue(CamOpts.Zoom, 'pixels');

  // in radians
  var angleOfView = 2 * Math.atan((compWidth / 2) / zoomPx);

  // in mm
  var focalLength = (FILM_WIDTH_MM * zoomPx) / compWidth;

  // all units returned in mm / degrees
  return {
    aperture: getValue(CamOpts.Aperture, 'mm'),
    focusDistance: getValue(CamOpts['Focus Distance'], 'mm'),
    focalLength: focalLength,
    angleOfView: angleOfView * 180 / Math.PI,
    zoom: pixelToMillimeter(zoomPx),
    filmSize: FILM_WIDTH_MM
  };
};
