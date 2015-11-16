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
  var UserQuery = new Parse.Query('_User');
  UserQuery.find().then(function(results) {
    // Gets all of the Users
    return results
  }).then(function (users) {
    // console.log(users)
    var userMap = {}
    for (var i = 0; i < users.length; i++)
    {
      userMap[users[i].get('username')] = users[i]
    }

    var portfolios = {}
    var count = users.length
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
  portfolioQuery.first().then( function(port) 
  {
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
  })
}


//Main
$(function() {
  Parse.$ = jQuery;

	// Initialize Parse with your Parse application javascript keys
	Parse.initialize("IPFf3U6ekcWWlAbu3Ck38MSeF7hhA63lIMX1gPDZ", "EFgmizr1ZAhgmkc3RNWYmnQC0tOlIuaspPcT8rEE");
  var portfolioMap = {}
  computePortfolios(portfolioMap);
  

  $('#login-form').submit(function(e) {
    e.preventDefault();
    var username = $("#username").val().trim();
    var password = $("#password").val().trim();

    Parse.User.logIn(username, password, {
      success: function(user) {
        // console.log(user);
        $('#login-form').hide();
        $('#table-login-message').hide();
        $('#trade-form').removeClass("hidden");
        $('#logged-in-as').text("Logged in as " + user.get("username"));

        //get this user's portfolio
        var portfolioQuery = new Parse.Query('Portfolio')
        portfolioQuery.equalTo('username', Parse.User.current().get('username'))
        portfolioQuery.first().then( function (port) {
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
              var value = addCommas((price * shares).toFixed(2))
              var dayGain = (price - open) * shares
              totalValue[5] += dayGain
              totalValue[6] += price * shares
              if (dayGain >= 0) {
                positionsTable += "<tr BGCOLOR=\"#00b300\">"
              } else {
                positionsTable += "<tr BGCOLOR=\"#ff3f00\">"
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
          
        })
      },
      error: function(user, error) {
        alert("Login Failed");
      }
    })
  })

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
