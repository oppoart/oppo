"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.isOverdue = isOverdue;
exports.getRelativeTime = getRelativeTime;
exports.generateId = generateId;
exports.capitalize = capitalize;
exports.truncate = truncate;
exports.sleep = sleep;
function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(date);
}
function formatDateTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}
function isOverdue(date) {
    return date < new Date();
}
function getRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
    const absDiff = Math.abs(diffInSeconds);
    if (absDiff < 60) {
        return 'Just now';
    }
    const units = [
        { name: 'year', seconds: 31536000 },
        { name: 'month', seconds: 2592000 },
        { name: 'week', seconds: 604800 },
        { name: 'day', seconds: 86400 },
        { name: 'hour', seconds: 3600 },
        { name: 'minute', seconds: 60 },
    ];
    for (const unit of units) {
        const count = Math.floor(absDiff / unit.seconds);
        if (count >= 1) {
            const suffix = count === 1 ? '' : 's';
            const timeString = `${count} ${unit.name}${suffix}`;
            return diffInSeconds < 0 ? `${timeString} ago` : `in ${timeString}`;
        }
    }
    return 'Just now';
}
function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
function truncate(text, length) {
    if (text.length <= length)
        return text;
    return text.substring(0, length).trim() + '...';
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
//# sourceMappingURL=utils.js.map