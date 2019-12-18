const express = require('express');
const bodyParser = require('body-parser');
const firebaseAdmin = require('firebase-admin')

/* initalize express */
const app = express();

// middlewear
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
  extended: false
}));


/* initalize firebase */
const EXPIREY_TIME = 1.8e+6;

// check if the enviroment variable for auth is set
if (process.env.FIREBASECONFIG) {

  // initalize the app with the contents of the enviroment var
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(JSON.parse(process.env.FIREBASECONFIG)),
    databaseURL: 'https://cta-display.firebaseio.com/'
  });
} else {
  // local file with firebase creds
  let localCreds = require('./firebase-key.json');

  // otherwise load from a local file
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(localCreds),
    databaseURL: 'https://cta-display.firebaseio.com/'
  });
}
const database = firebaseAdmin.database();

const getPingTime = () => {
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

  return timeString;
}

const getUpdatedDevices = async () => {
  const root = database.ref('/');
  // TODO: error handeling
  // get every device
  const snapshot = await root.once('value');
  const devices = snapshot.val();

  // loop through them and find devices which have expired
  for (deviceKey in devices) {
    const lastPingDate = new Date(devices[deviceKey].lastPing); // turn the time string into a date object
    if ((Date.now() - lastPingDate.getTime()) > EXPIREY_TIME) {
      
      // append a status and set it to false
      devices[deviceKey].status = false;
    } else {
      // otherwise, the device must be alive
      console.log("applyig falsity")
      devices[deviceKey].status = true;
    }
  }
  return devices;
}

app.use(express.static('src/public'));

app.post('/devices/alive/:id', async (req, res) => {
  // set the devices status and record its ping time
  const root = database.ref('/');
  try {
    await root.update({
      [req.params.id]: {
        lastPing: getPingTime() // last ping time string
      }
    })
    res.json({
      message: "Device status updated"
    });
  } catch (error) {
    res.json({
      // legacy support for announcement display means 'error' must be used
      error: "Could not update status due to a database error: ${error.message}",
      message: "Could not update status due to a database error: ${error.message}"
    });
  }
})

app.get('/devices', async (req, res) => {
  try {
    const devices = await getUpdatedDevices(); // get the updated list of devices
    res.json(devices);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
})

app.delete('/devices/:id', async (req, res) => {
  const deviceRef = database.ref(`/${req.params.id}`);
  try {
    await deviceRef.remove();
    res.json({
      message: 'Device has been deleted'
    })
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
})

app.listen(process.env.PORT || 8080)