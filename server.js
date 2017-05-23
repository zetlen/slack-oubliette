const express = require('express');
const SlackClients = require('./slack-clients');
const SlackStreams = require('./slack-info');
const Sorters = require('./sorters');
const Filter = require('./filter');
const pick = require('lodash/fp/pick');
const humanize = require('humanize');
const apicache = require('apicache');
const cors = require('cors');

console.log('Starting up...');
const app = express();
app.set('json spaces', 1);
app.use(cors());

const attrs = [
  'id',
  'created',
  'name',
  'title',
  'filetype',
  'size',
  'thumb_80',
  'url_private',
  'pinned_to',
  'channels',
  'username'
];

const totalOn = ['filetype', 'username'];

function totalize(items) {
  return {
    count: items.length,
    size: items.reduce(function(total, item) {
      return total + item.size;
    }, 0)
  };
}

const getAttrs = pick(attrs);
function toRecord(row) {
  const record = getAttrs(row);
  record.filesize = humanize.filesize(record.size);
  return record;
}

console.log('Creating sorters...');
const sorters = Sorters(attrs, {
  exceptions: {
    channels: Sorters.lexical('length'),
    pinned_to: Sorters.lexical('length')
  }
});

console.log('Creating filter...');
const filterOn = Filter();

console.log('Creating Slack clients...')
const clients = SlackClients();

console.log('Initial files cache load...')
const streams = SlackStreams(clients, toRecord);

var records;
var error;
streams.records$.subscribe(
  function(latest) {
    error = null;
    records = latest;
    console.log(`Received ${records.length} new records from stream`);
    apicache.clear();
  },
  function(e) {
    error = e;
    console.error('Received error on records stream!', e);
    apicache.clear();
  }
);

var cache = apicache
  .options({
    debug: true,
    statusCodes: {
      include: [200]
    }
  })
  .middleware('1 day');

app.get('/', cache, function(req, res) {
  if (!records) {
    return res.status(503).send('Cache warming up. Please wait.');
  }
  var items = records.slice();
  var sort = req.query.sort;
  if (sort) {
    let sorter = sorters(sort);
    if (!sorter) {
      return res.status(400).send(`No sorter found matching ${req.query.sort}. Valid sorters are ${sorters.valid}`);
    }
    items.sort(sorter);
  }
  var filter = req.query.filter;
  if (filter) {
    items = filterOn(filter, items);
    if (typeof items === 'string') {
      return res.status(400).send(items);
    }
  }
  var totals;
  if (req.query.totals) {
    totals = totalOn.reduce(function(out, attr) {
      out[attr] = {};
      return out;
    }, { all: { size: 0, count: 0 } });
    items.forEach(function(item) {
      totals.all.size += item.size;
      totals.all.count += 1;
      totalOn.forEach(function(attribute) {
        var value = item[attribute];
        if (!totals[attribute][value]) {
          totals[attribute][value] = { size: 0, count: 0 };
        }
        totals[attribute][value].size += item.size;
        totals[attribute][value].count += 1;
      });
    });
    totals.all.filesize = humanize.filesize(totals.all.size);
    totalOn.forEach(function(attribute) {
      var subtotal = totals[attribute];
      Object.keys(subtotal).forEach(function(key) {
        subtotal[key].filesize = humanize.filesize(subtotal[key].size);
      });
    })
  }
  res.json({
    sorted: sort,
    filtered: filter,
    count: items.length,
    totals,
    items
  });
});

var port = process.env.PORT || 4001;
app.listen(port);
console.log('listening on port ' + port);
clients.rtm.start();
console.log('listening to slack rtm');
