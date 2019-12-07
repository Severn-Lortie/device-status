
const getDevices = async (url) => {
    let result;
    try {
        result = await axios.get(url);
    } catch(e) {
        console.log(e.message);
    }
    return result;
}

getDevices('http://localhost:8080/devices').then((result) => {
    const deviceTable = document.getElementById('device-table');
    for (let key in result.data) {
        const device = result.data[key];

        // create device row
        const deviceRow = document.createElement('tr');
        
        // create device row fields
        const deviceName = document.createElement('td');
        deviceName.innerHTML = key;     
        
        const deviceStatus = document.createElement('td');
        deviceStatus.innerHTML = device.status ? 'Alive' : 'Offline';
        if (device.status) {
            deviceStatus.style.backgroundColor = "#5cb85c"
            deviceStatus.style.color = "white"
        } else {
            deviceStatus.style.backgroundColor = "#d9534f";
            deviceStatus.style.color = "white"
        }
        
        const deviceLastPing = document.createElement('td');
        deviceLastPing.innerHTML = device.lastPing;

        // append
        deviceRow.appendChild(deviceName);
        deviceRow.appendChild(deviceStatus);
        deviceRow.appendChild(deviceLastPing);

        deviceTable.appendChild(deviceRow);
    }
})

