const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
  extended: false
}));

app.use(express.static('./public'));

const getPingTimes = () => {

  const now = new Date();

  // assemble last ping string
  const timeString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    timeZone: 'America/New_York'
  })

  // milliseconds for ping time
  const millis = now.getTime();

  return {
    timeString,
    millis
  }
}

const makeOffline = () => {

  const now = new Date();

  // read the file
  fs.readFile('./devices.json', (err, data) => {
    const devices = JSON.parse(data);

    for (key in devices) {
      const device = devices[key];

      // if the device has not pinged in 30 mins set status to inactive
      if ((now.getTime() - device.lastPingMillis) > 1000 * 60 * 30) {
        device.status = false;
      }
    }

    // update the device statuses
    fs.writeFile('./devices.json', JSON.stringify(devices), (err) => {
      if (err) console.log('Problem updating device statuses: ', err.message);
    })
  })
}


app.post('/devices/alive/:id', (req, res) => {

  fs.readFile('./devices.json', (err, data) => {
    if (err) res.status(500).json({
      error: 'Unable to read device list'
    });
    else {

      const devices = JSON.parse(data);

      // check if the device exists
      if (devices[req.params.id]) {
        // add the new status
        devices[req.params.id].status = true;

        // add the ping time
        const timings = getPingTimes();
        devices[req.params.id].lastPing = timings.timeString;
        devices[req.params.id].lastPingMillis = timings.millis;

        // write the new file
        fs.writeFile('./devices.json', JSON.stringify(devices), (err) => {
          if (err) res.status(500).json({
            error: 'Unable to update device status'
          });
          else {
            res.status(200).json({
              message: "Device status updated"
            })
          }
        })
      } else {
        // error device not found
        res.status(404).json({
          error: 'Device not found'
        })
      }
    }
  })
})

app.post('/devices/:id', (req, res) => {

  // load in JSON file
  fs.readFile('./devices.json', (err, data) => {
    if (err) res.status(500).json({
      error: 'Unable to read device list'
    });
    else {

      const devices = JSON.parse(data);

      // check if device already exists
      if (devices[req.params.id]) {
        res.status(409).json({
          error: "This device already exists"
        })
      } else {

        // add the timings and status
        const timings = getPingTimes();
        devices[req.params.id] = {
          status: true,
          lastPing: timings.timeString,
          lastPingMillis: timings.millis
        };

        // write the device
        fs.writeFile('./devices.json', JSON.stringify(devices), (err) => {
          if (err) res.status(500).json({
            error: 'Unable to add device'
          });
          else {
            res.status(200).json({
              message: 'Device added'
            })
          }
        })
      }
    }
  })
})

app.get('/devices', (req, res) => {
  makeOffline();
  fs.readFile('./devices.json', (err, data) => {
    if (err) res.status(500).message({
      error: 'Unable to read device list'
    });
    else {
      res.status(200).json(JSON.parse(data));
    }
  })
})

app.delete('/devices/:id', (req, res) => {

  // load in JSON file
  fs.readFile('./devices.json', (err, data) => {
    if (err) res.status(500).json({error: 'Devices could not be loaded'});
    else {

      const devices = JSON.parse(data);
      
      // check if device exists
      if (devices[req.params.id]) {
        // delete the device
        delete devices[req.params.id];
        
        fs.writeFile('./devices.json', JSON.stringify(devices), (err) => {
          if (err) res.status(500).json({error: 'Unable to delete device'})
          else {
            res.status(200).json({message: 'Device deleted'})
          }
        })
        
      } else {
        res.status(404).json({error: 'Device does not exist'})
      }
    }
  })
})

app.listen(process.env.PORT || 8080)