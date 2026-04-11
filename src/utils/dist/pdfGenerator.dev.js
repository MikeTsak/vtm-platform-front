"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = generateVTMCharacterSheetPDF;

var _pdfLib = require("pdf-lib");

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function generateVTMCharacterSheetPDF(characterData) {
  var tempHealth,
      tempWillpower,
      url,
      response,
      existingPdfBytes,
      pdfDoc,
      form,
      sheet,
      setTextField,
      fillDots,
      attrs,
      skills,
      disciplines,
      discEntries,
      pdfBytes,
      blob,
      link,
      _args = arguments;
  return regeneratorRuntime.async(function generateVTMCharacterSheetPDF$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          tempHealth = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};
          tempWillpower = _args.length > 2 && _args[2] !== undefined ? _args[2] : {};
          _context.prev = 2;
          // 1. Fetch the blank interactive PDF from the public folder
          url = '/Vampire_5thEdition_2-Page_Interactive.pdf';
          _context.next = 6;
          return regeneratorRuntime.awrap(fetch(url));

        case 6:
          response = _context.sent;

          if (response.ok) {
            _context.next = 9;
            break;
          }

          throw new Error("Could not find the PDF file in the public folder.");

        case 9:
          _context.next = 11;
          return regeneratorRuntime.awrap(response.arrayBuffer());

        case 11:
          existingPdfBytes = _context.sent;
          _context.next = 14;
          return regeneratorRuntime.awrap(_pdfLib.PDFDocument.load(existingPdfBytes));

        case 14:
          pdfDoc = _context.sent;
          form = pdfDoc.getForm();
          sheet = characterData.sheet || {}; // --- Helper to safely set Text Fields ---

          setTextField = function setTextField(fieldName, text) {
            try {
              var field = form.getTextField(fieldName);
              if (field) field.setText(text ? String(text) : '');
            } catch (e) {// Field not found, ignore safely
            }
          }; // --- Helper to safely fill Dot Checkboxes ---
          // Interactive V5 sheets usually name their dots like "Strength 1", "Strength 2", etc.


          fillDots = function fillDots(baseName, value) {
            var num = Number(value) || 0;

            for (var i = 1; i <= 5; i++) {
              try {
                // Try standard naming conventions
                var check = form.getCheckBox("".concat(baseName, " ").concat(i)) || form.getCheckBox("".concat(baseName).concat(i));

                if (check) {
                  if (i <= num) check.check();else check.uncheck();
                }
              } catch (e) {
                /* ignore */
              }
            }
          }; // 3. Fill Basic Information


          setTextField('Name', characterData.name);
          setTextField('Concept', sheet.concept);
          setTextField('Chronicle', sheet.chronicle);
          setTextField('Ambition', sheet.ambition);
          setTextField('Desire', sheet.desire);
          setTextField('Sire', sheet.sire);
          setTextField('Clan', characterData.clan);
          setTextField('Generation', sheet.generation || '');
          setTextField('Predator', sheet.predatorType || sheet.predator_type || ''); // 4. Fill Attributes

          attrs = sheet.attributes || {};
          ['Strength', 'Dexterity', 'Stamina', 'Charisma', 'Manipulation', 'Composure', 'Intelligence', 'Wits', 'Resolve'].forEach(function (attr) {
            fillDots(attr, attrs[attr]);
          }); // 5. Fill Skills

          skills = sheet.skills || {};
          Object.entries(skills).forEach(function (_ref) {
            var _ref2 = _slicedToArray(_ref, 2),
                skillName = _ref2[0],
                skillData = _ref2[1];

            // Handle both flat dots or object { dots: X, specialties: [] }
            var dots = _typeof(skillData) === 'object' ? skillData.dots : skillData;
            fillDots(skillName, dots);
          }); // 6. Fill Disciplines

          disciplines = sheet.disciplines || {};
          discEntries = Object.entries(disciplines).filter(function (_ref3) {
            var _ref4 = _slicedToArray(_ref3, 2),
                _ = _ref4[0],
                v = _ref4[1];

            return Number(v) > 0;
          });
          discEntries.forEach(function (_ref5, index) {
            var _ref6 = _slicedToArray(_ref5, 2),
                discName = _ref6[0],
                dots = _ref6[1];

            // Interactive PDFs usually have generic fields for Disciplines like "Discipline 1", "Discipline 2"
            setTextField("Discipline ".concat(index + 1), discName);
            fillDots("Discipline ".concat(index + 1), dots);
          }); // 7. Health & Willpower Max
          // (If the PDF has specific text fields for tracking max/current, it attempts to fill them)

          setTextField('Health', String(sheet.health_max || ''));
          setTextField('Willpower', String(sheet.willpower_max || '')); // Optional: Flatten the form so the player can't edit the downloaded PDF
          // form.flatten();
          // 8. Serialize and Download

          _context.next = 39;
          return regeneratorRuntime.awrap(pdfDoc.save());

        case 39:
          pdfBytes = _context.sent;
          blob = new Blob([pdfBytes], {
            type: 'application/pdf'
          });
          link = document.createElement('a');
          link.href = window.URL.createObjectURL(blob);
          link.download = "".concat((characterData.name || 'Character').replace(/\s+/g, '_'), "_Sheet.pdf");
          link.click();
          _context.next = 51;
          break;

        case 47:
          _context.prev = 47;
          _context.t0 = _context["catch"](2);
          console.error('PDF Generation Error:', _context.t0);
          alert('Failed to generate PDF. Make sure Vampire_5thEdition_2-Page_Interactive.pdf is in your public/ folder!');

        case 51:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[2, 47]]);
}