const sevenDays = 7*24*60*60*1000;

export function storeCookie(name, json) {
    // Serialize the object to a JSON string
    const cookieValue = encodeURIComponent(JSON.stringify(json));
    document.cookie = `${name}=${cookieValue}; expires=${new Date(Date.now() + sevenDays).toUTCString()}; path=/`;
}

export function readCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        let raw = parts[1].split(";")[0];
        if (raw) {
            const value = decodeURIComponent(raw);
            const result = JSON.parse(value);
            console.log(result)
            return result;
        }
    }
    return "";
}