"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resizeImages = exports.processImages = exports.checkDirectoryForImages = exports.isFileImage = void 0;
var fs = require("fs");
var worker_threads_1 = require("worker_threads");
var aimLength = 70;
function _messagePad(message) {
    var paddingRequired = aimLength - message.length;
    var padSize = (paddingRequired / 2) - 2;
    var padding = '';
    for (var i = 0; i < padSize; i++) {
        padding += '=';
    }
    return "".concat(padding, " ").concat(message, " ").concat(padding);
}
function isFileImage(fileName) {
    return fileName.match(/\.(jpe?g|png)$/gm) !== null;
}
exports.isFileImage = isFileImage;
function pathShake(directoryPath, includeBase) {
    if (includeBase === void 0) { includeBase = true; }
    return __awaiter(this, void 0, void 0, function () {
        var foundPaths, DirEnts, _i, DirEnts_1, dirent, _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    foundPaths = [];
                    if (!fs.existsSync(directoryPath))
                        return [2 /*return*/, []];
                    DirEnts = fs.readdirSync(directoryPath, { withFileTypes: true });
                    console.log('Found', DirEnts.length, 'in', directoryPath);
                    _i = 0, DirEnts_1 = DirEnts;
                    _d.label = 1;
                case 1:
                    if (!(_i < DirEnts_1.length)) return [3 /*break*/, 4];
                    dirent = DirEnts_1[_i];
                    if (!dirent.isDirectory()) return [3 /*break*/, 3];
                    _b = (_a = foundPaths.push).apply;
                    _c = [foundPaths];
                    return [4 /*yield*/, pathShake(directoryPath + '/' + dirent.name)];
                case 2:
                    _b.apply(_a, _c.concat([_d.sent()]));
                    _d.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    if (includeBase)
                        foundPaths.push(directoryPath);
                    return [2 /*return*/, foundPaths];
            }
        });
    });
}
function chunkify(array, cores) {
    var chunks = [];
    for (var i = cores; i > 0; i--) {
        chunks.push(array.splice(0, Math.ceil(array.length / i)));
    }
    return chunks;
}
function checkDirectoryForImages(path, cores) {
    if (cores === void 0) { cores = 4; }
    return __awaiter(this, void 0, void 0, function () {
        var images, tick, directories, chunks;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    images = [];
                    console.log(_messagePad('STARTING DIRECTORY CHECK'));
                    tick = performance.now();
                    return [4 /*yield*/, pathShake(path, false)];
                case 1:
                    directories = _a.sent();
                    chunks = chunkify(directories, cores);
                    console.log('using', chunks.length, 'workers');
                    return [4 /*yield*/, Promise.all(chunks.map(function (paths, index) {
                            var worker = new worker_threads_1.Worker("./utils/worker_checkForImages.js");
                            return new Promise(function (resolve) {
                                worker.on('message', function (foundImages) {
                                    console.log('Worker', index, 'finished. ', performance.now() - tick);
                                    images.push.apply(images, foundImages);
                                    resolve();
                                });
                                worker.postMessage({
                                    paths: paths,
                                    index: index
                                });
                            });
                        }))];
                case 2:
                    _a.sent();
                    console.log(performance.now() - tick);
                    console.log(_messagePad('DIRECTORY CHECK - ALL WORKERS FINISHED'));
                    return [2 /*return*/, images.sort(function (imageA, imageB) {
                            return imageA.date.getTime() - imageB.date.getTime();
                        })];
            }
        });
    });
}
exports.checkDirectoryForImages = checkDirectoryForImages;
function processImages(images, cores) {
    if (cores === void 0) { cores = 4; }
    return __awaiter(this, void 0, void 0, function () {
        var formattedImages, tick, chunks;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    formattedImages = [];
                    console.log(_messagePad('STARTING IMAGE PROCESSING'));
                    tick = performance.now();
                    chunks = chunkify(images, cores);
                    console.log('using', chunks.length, 'workers');
                    return [4 /*yield*/, Promise.all(chunks.map(function (images, index) {
                            var worker = new worker_threads_1.Worker("./utils/worker_formatImages.js");
                            return new Promise(function (resolve) {
                                worker.on('message', function (foundImages) {
                                    console.log('Worker', index, 'finished. ', performance.now() - tick);
                                    formattedImages.push.apply(formattedImages, foundImages);
                                    resolve();
                                });
                                worker.postMessage({ images: images, index: index });
                            });
                        }))];
                case 1:
                    _a.sent();
                    console.log(performance.now() - tick);
                    console.log(_messagePad('IMAGE PROCESSING - ALL WORKERS FINISHED'));
                    return [2 /*return*/, formattedImages.sort(function (imageA, imageB) {
                            return imageA.date.getTime() - imageB.date.getTime();
                        })];
            }
        });
    });
}
exports.processImages = processImages;
function resizeImages(images, cores) {
    if (cores === void 0) { cores = 4; }
    return __awaiter(this, void 0, void 0, function () {
        var imagesThatNeedResizing, tick, chunks;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log(_messagePad('STARTING IMAGE RESIZING'));
                    imagesThatNeedResizing = images.filter(function (image) {
                        var notPreviouslyResized = !fs.existsSync(image.thumbPath);
                        var imageTooBig = image.pixels > 230400;
                        return notPreviouslyResized && imageTooBig;
                    }) // Greater than 480x480, and not already resized
                    ;
                    tick = performance.now();
                    if (!imagesThatNeedResizing.length) return [3 /*break*/, 2];
                    chunks = chunkify(imagesThatNeedResizing, cores);
                    console.log('using', chunks.length, 'workers');
                    return [4 /*yield*/, Promise.all(chunks.map(function (images, index) {
                            var worker = new worker_threads_1.Worker("./utils/worker_resizeImages.js");
                            return new Promise(function (resolve) {
                                worker.on('message', function () {
                                    console.log('Worker', index, 'finished. ', performance.now() - tick);
                                    resolve();
                                });
                                worker.postMessage({ images: images, index: index });
                            });
                        }))];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    console.log(performance.now() - tick);
                    console.log(_messagePad('IMAGE RESIZING - ALL WORKERS FINISHED'));
                    return [2 /*return*/];
            }
        });
    });
}
exports.resizeImages = resizeImages;
