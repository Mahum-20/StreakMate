"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorStreakExpirations = exports.submitCheckIn = void 0;
const admin = require("firebase-admin");
admin.initializeApp();
var checkIn_1 = require("./streaks/checkIn");
Object.defineProperty(exports, "submitCheckIn", { enumerable: true, get: function () { return checkIn_1.submitCheckIn; } });
var streakMonitor_1 = require("./scheduled/streakMonitor");
Object.defineProperty(exports, "monitorStreakExpirations", { enumerable: true, get: function () { return streakMonitor_1.monitorStreakExpirations; } });
//# sourceMappingURL=index.js.map