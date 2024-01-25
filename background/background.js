if (typeof browser === "undefined") {
    var browser = chrome;
}

let db;

const db_name = 'wordlister_data_db';
const db_storeName_param = 'param';
const db_storeName_path = 'path';
const db_storeName_header = 'header';

const forbidden_resource_types = ["font", "image", "imageset", "media", "stylesheet", "xml_dtd"];

// Filter out paths with specific extensions
const forbidden_extensions = [
    '.svg', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', // Image formats
    '.css', '.scss', '.less', '.sass', '.woff', '.woff2', '.ttf', // Stylesheet formats
    '.htm', '.html', '.js', '.jsx', '.ts', '.tsx', // JavaScript and TypeScript formats
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', // Document formats
    '.mp3', '.ogg', '.wav', '.aac', '.flac', // Audio formats
    '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.m4s', // Video formats
    '.jsp', '.php', '.asp', '.aspx'
];

const common_headers = [
    "accept", "accept-charset", "accept-encoding",
    "accept-language", "accept-ranges", "authorization",
    "cache-control", "connection", "content-encoding",
    "content-language", "content-length", "content-location",
    "content-md5", "content-range", "content-type", "cookie", "date",
    "etag", "expect", "expires", "from", "host", "if-match",
    "if-modified-since", "if-none-match", "if-range",
    "if-unmodified-since", "last-modified", "location", "max-forwards",
    "pragma", "proxy-authenticate", "proxy-authorization", "range",
    "referer", "retry-after", "server", "set-cookie", "te", "trailer",
    "transfer-encoding", "upgrade", "user-agent", "vary", "via",
    "warning", "www-authenticate", "alt-used", "sec-fetch-dest", "sec-fetch-mode",
    "sec-fetch-site", "sec-fetch-user", "upgrade-insecure-requests", "origin"
];

function get_uncommon_headers(httpHeaders) {
    if (!httpHeaders) {
        return [];
    }
    
    const headerNames = httpHeaders.map(header => header.name.toLowerCase());
    
    const uncommonHeaders = headerNames.filter(
        header => !common_headers.includes(header)
    );

    return uncommonHeaders;
}

const entropy = str => {
    return [...new Set(str)]
      .map(chr => {
        return str.match(new RegExp(chr, 'g')).length;
      })
      .reduce((sum, frequency) => {
        let p = frequency / str.length;
        return sum + p * Math.log2(1 / p);
      }, 0);
  };

function extract_first_level_domain(url) {
    const full_domain = url.host;
    const domain_parts = full_domain.split(".");
    return  domain_parts[domain_parts.length - 2];
}

function get_uncommon_pathname(details) {

    if (!details.url) {
        return "";
    }

    const url = new URL(details.url);
    const pathname = url.pathname;

    if (pathname.includes('=')) {
        return "";
    }
    
    const first_level_hostname = extract_first_level_domain(url);
    if (pathname.includes(first_level_hostname)) {
        return "";
    }

    const extension = pathname.slice(pathname.lastIndexOf('.')).toLowerCase();
    if (forbidden_extensions.includes(extension)) {
        return "";
    }

    if (entropy(pathname) >= 4.5) {
        return "";
    }

    return pathname;
}

function get_search_params(url) {

    if (!url) {
        console.warn('URL is undefined or null');
        return [];
    }

    const urlObject = new URL(url);
    const queryParams = urlObject.searchParams;

    const parameterList = [];

    queryParams.forEach((value, key) => {
        parameterList.push(key);
    });

    return parameterList;
}

function add_to_object_store(db_store_name, data) {

    if (!data) {
        console.warn('data is undefined. Skipping.');
        return;
    }

    let transaction = db.transaction(db_store_name, 'readwrite');
    let objectStore = transaction.objectStore(db_store_name);

    if (Array.isArray(data)) {
        for (const item of data) {
        objectStore.add(item);
        }
    } else {
        objectStore.add(data);
    }
}

function on_before_send_headers(details) {

    if (forbidden_resource_types.includes(details.type)) {
        return;
    }

    const uncommon_path = get_uncommon_pathname(details)

    if (uncommon_path !== "") {
        add_to_object_store(db_storeName_path, 
            {
            'pathname': uncommon_path,
            'first_seen_at': details.url,
            'first_seen': new Date().toISOString()
            }
        );
    }


    const search_params = get_search_params(details.url).map(param => ({
        'name': param,
        'first_seen_at': details.url.Array,
        'first_seen': new Date().toISOString()
    }));

    if (search_params.length) {
        add_to_object_store(db_storeName_param, search_params);
    }
    

    
    if (details.requestHeaders) {
        
        const uncommon_headers= get_uncommon_headers(details.requestHeaders).map(header => ({
            'name': header,
            'first_seen_at': details.url,
            'first_seen': new Date().toISOString()
        }));;
        
        if (uncommon_headers.length) {
            add_to_object_store(db_storeName_header, uncommon_headers);
        }
        
    }
}

function on_headers_received(details) {

    if (forbidden_resource_types.includes(details.type)) {
        return;
    }

    if (details.responseHeaders) {

        const uncommon_headers= get_uncommon_headers(details.requestHeaders).map(header => ({
            'name': header,
            'first_seen_at': details.url,
            'first_seen': new Date().toISOString()
        }));;

        if (uncommon_headers.length) {
            add_to_object_store(db_storeName_header, uncommon_headers);
        }

    }
}

const DBOpenRequest = indexedDB.open(db_name);

DBOpenRequest.onsuccess = (event) => {
    db = DBOpenRequest.result;
    console.log('Successfully opened the IndexedDB:', db);
};

DBOpenRequest.onupgradeneeded = (event) => {
    db = event.target.result;

    // Create an objectStore for this database
    console.debug(
        `Upgrading IndexedDB. Creating object stores: ${db_storeName_path}, ${db_storeName_header}, ${db_storeName_param}`
    );
    db.createObjectStore(db_storeName_path, {
        keyPath: 'pathname'
    });
    db.createObjectStore(db_storeName_header, {
        keyPath: 'name'
    });
    db.createObjectStore(db_storeName_param, {
        keyPath: 'name'
    });
};

browser.webRequest.onBeforeSendHeaders.addListener(on_before_send_headers, {
    urls: ['<all_urls>']
}, ['requestHeaders']);
browser.webRequest.onHeadersReceived.addListener(on_headers_received, {
    urls: ['<all_urls>']
}, ['responseHeaders']);