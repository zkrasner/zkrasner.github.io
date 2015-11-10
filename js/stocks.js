function getQuote(ticker) {
  var url = "http://query.yahooapis.com/v1/public/yql";
  var data = "q=select%20*%20from%20html%20where%20url%3D%22http%3A%2F%2Ffinance.yahoo.com%2Fq%3Fs%3D" + ticker + "%22%20and%20xpath%3D'%2F%2Fspan%5B%40id%3D%22yfs_l10_" + ticker + "%22%5D'&format=json";
  var data = encodeURIComponent("select * from yahoo.finance.quotes where symbol in ('" + ticker + "')");
  return $.getJSON(url, 'q=' + data + "&format=json&diagnostics=true&env=http://datatables.org/alltables.env")
  .then(function (data) {
    var price = parseFloat(data.query.results.quote.LastTradePriceOnly);
    console.log(price)
    return price
  });
}

function computePortfolios () {
  var UserQuery = new Parse.Query('_User');
  var ret = null;
  UserQuery.find().then(function(results) {
    return results
  }).then(function(users) {
    var portfolioMap = new Map()
    console.log(users)
    
    for (var i = 0; i < users.length; i++)
    {
      var portfolioQuery = new Parse.Query('Portfolio')
      portfolioQuery.equalTo('username', users[0].get('username'))
      portfolioQuery.first().then(function(port) 
      {
        var positions = port.get('positions')
        var tickers = Object.keys(positions)
        console.log(positions)
        var total = 0;
        for (var j = 0; j < tickers.length; j++) 
        {
          getQuote(tickers[j]).then(function (price) {
            total += price * parseInt(positions[tickers[j]])
            if (j == tickers.length - 1) {
              console.log(total)
            }
          })
        }
      })
    }
  });
}

$(function() {
  Parse.$ = jQuery;

	// Initialize Parse with your Parse application javascript keys
	Parse.initialize("IPFf3U6ekcWWlAbu3Ck38MSeF7hhA63lIMX1gPDZ", "EFgmizr1ZAhgmkc3RNWYmnQC0tOlIuaspPcT8rEE");
  var c = computePortfolios();
  

  $('#login-form').submit(function(e) {
    e.preventDefault();
    var username = $("#username").val();
    var password = $("#password").val();

    Parse.User.logIn(username, password, {
      success: function(user) {
        console.log(user);
        $('#login-form').hide();
        $('#table-login-message').hide();
        $('#trade-form').removeClass("hidden");
        $('#logged-in-as').text("Logged in as " + user.get("username"));
        
        // var tableHTML = "<tr><td>Cash</td><td>-</td><td>-</td><td>-</td><td>-</td><td>$" + user.get('cash') + "</td><td>-</td><td>-</td><td>-</td></tr>"
        // $('#portfolio tbody').html(tableHTML);
        // var query = new Parse.Query('Trade')
        // query.equalTo("username", user.get('username'))
        // console.log(user.get('username'))
        // query.find({
        //   success: function(result) {
        //     console.log(result.length + " trades found")
        //     var url = "http://query.yahooapis.com/v1/public/yql";
        //     var stock_share_map = new Map();
        //     for (var i = 0; i < result.length; i++) {
        //       var t = result[i];

        //       var symbol = t.get('ticker');
        //       map.set(symbol, t)
        //     }
        //   },
        //   error: function(error) {
        //     console.log("error getting trades")
        //   }
        // });
},

error: function(user, error) {
  alert("Login Failed");
}
});
});



$('#trade-form').submit(function(e) {
  e.preventDefault();
  var user = Parse.User.current()
  console.log(user);

});
});
