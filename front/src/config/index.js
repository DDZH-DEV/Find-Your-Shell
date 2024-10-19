import storage from "../libs/storage";

console.log(document.domain,window.location);

export default{
    'API_URL':storage.get('api_url') || window.location.origin || 'http://127.0.0.1:9999',
    'GITHUB_URL':'https://github.com/DDZH-DEV/Find-Your-Shell',
    'VERSION':'1.0.3',
    'PLATFORM':storage.get('platform') || '',
    'VIDEO_URL':storage.get('video_url') || ''
    }