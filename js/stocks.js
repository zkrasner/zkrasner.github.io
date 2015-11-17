function getQuote(ticker, shares) {
  var url = "http://query.yahooapis.com/v1/public/yql";
  var data = "q=select%20*%20from%20html%20where%20url%3D%22http%3A%2F%2Ffinance.yahoo.com%2Fq%3Fs%3D" + ticker + "%22%20and%20xpath%3D'%2F%2Fspan%5B%40id%3D%22yfs_l10_" + ticker + "%22%5D'&format=json";
  var data = encodeURIComponent("select * from yahoo.finance.quotes where symbol in ('" + ticker + "')");
  return $.getJSON(url, 'q=' + data + "&format=json&diagnostics=true&env=http://datatables.org/alltables.env")
  .then(function (data) {
    var price = parseFloat(data.query.results.quote.LastTradePriceOnly);
    if (shares == 0) {
      //console.log(ticker + " " + price)
      return price
    } else {
      //console.log(ticker + " " + price + " x " + shares + " = " + price * shares)
      return price * shares
    }
  });
}

function getQuotePromise(ticker) {
  var url = "http://query.yahooapis.com/v1/public/yql";
  var data = "q=select%20*%20from%20html%20where%20url%3D%22http%3A%2F%2Ffinance.yahoo.com%2Fq%3Fs%3D" + ticker + "%22%20and%20xpath%3D'%2F%2Fspan%5B%40id%3D%22yfs_l10_" + ticker + "%22%5D'&format=json";
  var data = encodeURIComponent("select * from yahoo.finance.quotes where symbol in ('" + ticker + "')");
  // console.log("Searching for " + ticker)
  return $.getJSON(url, 'q=' + data + "&format=json&diagnostics=true&env=http://datatables.org/alltables.env")
}


function computePortfolios (portfolios) {
  console.log("computing portfolios")
  var PortQuery = new Parse.Query('Portfolio');
  console.log("about to find all portfolios")
  PortQuery.find().then(function(results) {
    // Gets all of the Users
    console.log("got all of the users")
    return results
  }).then(function (ports) {
    // console.log(users)
    var userMap = {}
    for (var i = 0; i < ports.length; i++)
    {
      userMap[ports[i].get('username')] = ports[i]
    }

    var portfolios = {}
    var count = ports.length
    $.each(userMap, function (name, user) {
      sumPortfolio(user, portfolios)
    })
  });
}

function addCommas(nStr)
{
  nStr += '';
  x = nStr.split('.');
  x1 = x[0];
  x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }
  return x1 + x2;
}

function updateSummaryTable(portfolios) {
  var sortable = []
  for (var port in portfolios)
    sortable.push([port, portfolios[port]])
  sortable.sort( function (a, b) {return b[1] - a[1]})
  var tableRow = ""
  for (var name in sortable) {
    tableRow = tableRow + "<tr><td>" + sortable[name][0] + "</td>" +
    "<td>$" + addCommas(sortable[name][1].toFixed(2)) + "</td></tr>"
  } 
  $('#summary tbody').html(tableRow);
}

function sumPortfolio (user, portfolios) {
  // Get the portfolio of this user
  var portfolioQuery = new Parse.Query('Portfolio')
  portfolioQuery.equalTo('username', user.get('username'))
  var total = 0
  portfolioQuery.first({
    success: function(port){
      // Get the positions in this portfolio
      var positions = port.get('positions')
      var total = port.get('cash')

      if (!$.isEmptyObject(positions)) {
        var tickers = Object.keys(positions)
        // Get the prices for these stocks
        var count = Object.keys(positions).length
        $.each(positions, function (key, value) {
          getQuote(key, value).then( function (price) {
            total += price
            //console.log("after " + key + ": " + total)
            if (!--count) {
              //console.log("finished getting quotes for " + user.get('username'))
              portfolios[user.get('username')] = total
              //console.log(portfolios)
              updateSummaryTable(portfolios)
            }
          })
        })
      } else {
        portfolios[user.get('username')] = total
        updateSummaryTable(portfolios)
      }
    },
    error: function (error) {
      handleParseError(error)
    }
  })
}

function handleParseError(err) {
  switch (err.code) {
    case Parse.Error.INVALID_SESSION_TOKEN:
      Parse.User.logOut();
      // If web browser, render a log in screen
      // If Express.js, redirect the user to the log in route
      break;
    // Other Parse API errors that you want to explicitly handle
  }
}

function loggedIn() {
  console.log(Parse.User.current());
  $('#login-form').hide();
  $('#table-login-message').hide();
  $('#trade-form').removeClass("hidden");
  $('#logged-in-as').text("Logged in as " + Parse.User.current().get("username"));
}

function loggedOut() {
  console.log("Logging out");
  $('#login-form').show();
  $('#table-login-message').show();
  $('#trade-form').addClass("hidden");
  $('#portfolio tbody').html("");
}

function showPortfolio(username) {
  var portfolioQuery = new Parse.Query('Portfolio')
        portfolioQuery.equalTo('username', username)
        portfolioQuery.first({
          success: function (port) {
            //display the various positions
            var positionsTable = ""
            var positions = port.get('positions')
            var count = Object.keys(positions).length
            var totalValue = [0,0,0,0,0,0,0]
            $.each(port.get('positions'), function (key, shares) {
              getQuotePromise(key).then(function (data) {
                var price = parseFloat(data.query.results.quote.LastTradePriceOnly)
                var open = parseFloat(data.query.results.quote.Open)
                var changeDollars = addCommas((price - open).toFixed(2))
                var changePercent = parseFloat(data.query.results.quote.PercentChange).toFixed(2)
                var value = addCommas((price * shares).toFixed(3))
                var dayGain = (price - open) * shares
                totalValue[5] += dayGain
                totalValue[6] += price * shares
                if (dayGain >= 0) {
                  positionsTable += "<tr class='success'>"
                } else {
                  positionsTable += "<tr class='danger'>"
                }
                positionsTable += "<td>" + key + "</td>" + 
                                "<td>" + shares + "</td>" +
                                "<td>$" + addCommas((price).toFixed(2)) + "</td>" +
                                "<td>" + changeDollars + "</td>" +
                                "<td>" + changePercent + "%</td>" +
                                "<td>" + addCommas((dayGain).toFixed(2)) + "</td>" +
                                "<td>$" + value + "</td></tr>"
                if (!--count) {
                  positionsTable += "<tr><td>Cash</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>" +
                                    "<td>$" + addCommas(port.get('cash').toFixed(2)) + "</td>"
                  totalValue[6] += port.get('cash')
                  positionsTable += "<tr><td>Total</td><td>-</td><td>-</td><td>-</td><td>-</td>" + 
                                    "<td>" + addCommas(totalValue[5].toFixed(2)) + "</td>" +
                                    "<td>$" + addCommas(totalValue[6].toFixed(2)) + "</td>"  
                  $('#portfolio tbody').html(positionsTable);
                }
              })
            })
          },
          error: function (error) {
            handleParseError(error)
          }});
}


//Main
$(function() {
  console.log("beginning the js")
  Parse.$ = jQuery;

  if (Parse.User.current() != null) {
    loggedIn();
    showPortfolio(Parse.User.current().get('username'))
  }

  var portfolioMap = {}
  computePortfolios(portfolioMap);
  

  $('#login-form').submit(function (e) {

    e.preventDefault();
    var username = $("#username").val().trim();
    var password = $("#password").val().trim();
    $("#username").val("")
    $("#password").val("")
    Parse.User.logIn(username, password, {
      success: function(user) {
        
        loggedIn();
        //get this user's portfolio
        showPortfolio(Parse.User.current().get('username'))
      },
      error: function(user, error) {
        alert("Login Failed");
        handleParseError(error)
      }
    })
  });

  $('#logout_button').click(function (e) {
    e.preventDefault();
    console.log("asdfa")
    Parse.User.logOut().then( function () {
      console.log("Successfully logged out")
      loggedOut();
    })
  });

  $('#search-button').click( function (e) {
    e.preventDefault();
    // console.log($('#symbol').val().trim())
    getQuotePromise($('#symbol').val().trim()).then(function (data) {
      var price = parseFloat(data.query.results.quote.LastTradePriceOnly);
      // console.log("Found " + price + " after search")
      $('#share-price-label').text("Cost: $" + addCommas(price.toFixed(3)))
      var portfolioQuery = new Parse.Query('Portfolio')
      portfolioQuery.equalTo('username', Parse.User.current().get('username'))
      portfolioQuery.first().then( function (port) {
        var total = port.get('cash')
        $('#max-purchase-label').text("Max shares: " + addCommas(Math.floor(total/price)))
      })
    })
  })

  $('#execute-button').click(function (e) {
    e.preventDefault();
    var user = Parse.User.current()
    console.log(user);

  })
})
