var express = require('express');
var router = express.Router();
var dal = require('../data/dal_comp_statistics')
var HttpStatus = require('http-status-codes')
const cacheDb = require("sosi_cache_db_manager");
const cacheDbKey_DividendAnalysis = "sosi_ms0005_company_statistics.dividend_analysis"

var getDividendAnalysisData = function (data) {
  var result = {
    code: "",
    valuation: 0.00,
    dividend_yield: 0.00,
    avg_payout_12_mos: 0.00,
    avg_payout_5_yrs: 0.00,
    comp_grossdebt_ebtida: 0.00,
    dividend_yield_5_yrs: 0.00,
    company_roe: 0.00,
    company_roe_5_yrs: 0.00,
  }

  if (data === null || data === undefined || data === {} || !('code' in data)) {
    return undefined;
  } else {
    result.code = data.code;
    result.avg_payout_12_mos = ('payoutRatio' in data) ? data.payoutRatio : 0.00;
    result.avg_payout_5_yrs = 0.00;
    result.valuation = ('valuation' in data) ? data.valuation : 0.00;
    result.dividend_yield = ('dividendYeld' in data) ? data.dividendYeld : 0.00;
    result.comp_grossdebt_ebtida = ('grossDebitOverEbitida' in data) ? data.grossDebitOverEbitida : 0.00;
    result.dividend_yield_5_yrs = ('dividendYeld_5yrs' in data) ? data.dividendYeld_5yrs : 0.00;
    result.company_roe = ('returnOnEquity' in data) ? data.returnOnEquity : 0.00;
    result.company_roe_5_yrs = ('returnOnEquity_5yrAvg' in data) ? data.returnOnEquity_5yrAvg : 0.00;

    return result;
  }
}


/* GET home page. */
router.get('/', function (req, res, next) {
  if ((Object.keys(req.query).length === 0) || (Object.keys(req.query).indexOf("code") < 0)) {
    res.status(HttpStatus.EXPECTATION_FAILED).send("Stock code not informed")
  }

  new dal().get(req.query["code"], function (data) {
    res.status(HttpStatus.OK).send(data);
  }, function (data) {
    res.status(HttpStatus.METHOD_FAILURE).send(data)
  });
});

router.post('/', function (req, res, next) {
  if (!req.body) {
    res.status(HttpStatus.PARTIAL_CONTENT).send("Body message is required")
    return
  }

  if (!req.body.code) {
    res.status(HttpStatus.PARTIAL_CONTENT).send("Stock code is required")
    return
  }

  // Adding new history to the database
  new dal().add(req.body, function (data) {
    res.status(HttpStatus.OK).send(data)
  }, function (data) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(data)
  })
});

/* **********************************

  DIVIDEND ANALYSIS ENDPOINT SECTION

************************************* */

router.get('/dividend_analysis', function (req, res, next) {
  var cacheDbMngr = new cacheDb(cacheDbKey_DividendAnalysis)

  //Trying to get data from Redis
  cacheDbMngr.getValue(function (obj) {
    if (obj.data !== null) {
      res.status(HttpStatus.OK).send(JSON.parse(obj.data));
    } else {
      //Going to main db to retrieve the data if some error occurr when getting from Redis
      new dal()
        .getAll(function (data) {
          data.forEach(d => {
            var result = getDividendAnalysisData(d)

            if (result !== undefined) {
              lstData.push(result);
            }
          })

          res.status(HttpStatus.OK).send(lstData);
        }, function (data) {
          res.status(HttpStatus.METHOD_FAILURE).send(data);
        });
    }
  }, function (obj) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(obj);
  })
});

router.put('/dividend_analysis', function (req, res, next) {
  new dal().getAll(function (data) {
    var cacheDbMngr = new cacheDb(cacheDbKey_DividendAnalysis)
    var lstData = []

    if (data === null || data === undefined) {
      res.status(HttpStatus.EXPECTATION_FAILED).send("No data");
    } else {
      data.forEach(d => {
        var result = getDividendAnalysisData(d)

        if (result !== undefined) {
          lstData.push(result);
        }
      })

      cacheDbMngr.setValue(lstData, function (obj) {
        res.status(HttpStatus.OK).send(obj)
      }, function (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error)
      });
    }
  }, function (data) {
    res.status(HttpStatus.METHOD_FAILURE).send(data)
  });
});

module.exports = router;