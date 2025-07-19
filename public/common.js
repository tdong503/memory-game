function getCookie(name) {
    const cookieArr = document.cookie.split(';');

    for (let i = 0; i < cookieArr.length; i++) {
        const cookiePair = cookieArr[i].trim().split('=');

        if (cookiePair[0] === name) {
            return cookiePair[1];
        }
    }

    return null;
}

function setCookie(name, value, days) {
    let expires = '';

    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }

    document.cookie = name + "=" + value + expires + "; path=/";
}

function randHash(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const cryptoObj = window.crypto || window.msCrypto; // 支持IE11

    for (let i = 0; i < length; i++) {
        const randomIndex = cryptoObj.getRandomValues(new Uint32Array(1))[0] % chars.length;
        result += chars[randomIndex];
    }

    return result;
}
