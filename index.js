"use strict";

var https = require('https');
var url = require('url');

var latestAPIVersion = "1";

/*
===========
Constructor
===========
*/

function Beanstream(options) {

	if (!options) {
		throw new Error("No options supplied");
	}

	this.authenticationType = undefined;

	if (typeof options.username !== "undefined") {

		if (typeof options.password === "undefined") {
			throw new Error("No password supplied for the username");
		}

		this.username = options.username;
		this.password = options.password;
		this.authenticationType = "password";

	} else if (typeof options.merchant_id !== "undefined" && typeof options.passcode !== "undefined") {

		this.merchant_id = options.merchant_id;
		this.passcode = options.passcode;
		this.authenticationType = "passcode";

	} else {
		throw new Error("Invalid authentication supplied for Beanstream");
	}

	this.merchant_id = this.merchant_id || options.merchant_id;

	if (typeof this.merchant_id === "undefined") {
		throw new Error("No merchant_id supplied");
	}

	options = options || {};
	options.version = options.version || latestAPIVersion;

	if (options.version > latestAPIVersion) {
		console.warn("This library may not support an API version greater than `" + latestAPIVersion + "`. Contact this module's author to support newer versions.");
	}

	var authenticationHeader;
	var buffer;

	if (this.authenticationType === "password") {
		buffer = new Buffer([this.username, this.password].join(":"), 'utf8');
		authenticationHeader = "Basic ";
		authenticationHeader += buffer.toString('base64');
	} else if (this.authenticationType === "passcode") {
		buffer = new Buffer([this.merchant_id, this.passcode].join(":"), 'utf8');
		authenticationHeader = "Passcode ";
		authenticationHeader += buffer.toString('base64');
	}

	this.requestOptions = function() {
		var requestOptions = {
			port: 443,//https
			method: 'GET',
			headers: {
				"Content-Type": "application/json",
				"Accept": "application/json",
				"Authorization": authenticationHeader
			}
		};

		requestOptions.host = "www.beanstream.com";
		requestOptions.host = options.host || requestOptions.host;//allow overriding of host completely
		return requestOptions;
	};
	this.options = options;

	return this;
}


/*
=========
Utilities
=========
*/

function cloneObject(object) {
	var clone = {};
	for (var key in object) {
		if (object.hasOwnProperty(key)) {
			clone[key] = object[key];
		}
	}
	return clone;
}

//A minimal map of Beanstream errors. Needs expanding.
var beanstreamErrors = {
	7: "Card declined",
	16: "Duplicate Transaction",
	191: "Invalid transaction amount",
};

Beanstream.prototype._makeRequest = function(requestOptions, requestBody, next) {

	var responseBody = "";

	var req = https.request(requestOptions, function(res) {

		res.setEncoding('utf-8');
		res.on('data', function(chunk) {
			responseBody += chunk;
		});

		res.on('end', function() {

			var json;

			if (/^[45]\d\d/.test(res.statusCode)) {
				var errorText = "Beanstream server error";
				var error;

				try {//is JSON
					json = JSON.parse(responseBody);
				} catch(e) {//isn't JSON (comes in as HTML)
					json = null;
				}
				if (json) {
					errorText = beanstreamErrors[json.code] || json.message;
				}
				error = new Error(errorText);
				error.message = errorText;
				error.code = json? json.code : res.statusCode;
				return next(error);
			}

			json = JSON.parse(responseBody);
			next(null, json);
		});
	});

	req.on('error', function(err) {
		return next(err);
	});

	req.write(requestBody, 'utf8');
	req.end();//end request, proceed to response
};

/*
========
Payments
========
*/

Beanstream.prototype._payments = function(options, next) {

	options = options || {};
	var requestBody = JSON.stringify(options, null, '\t');

	for (var key in options) {
		if (typeof options[key] === "undefined") {
			delete options[key];
		}
	}

	var requestOptions = this.requestOptions();
	requestOptions.method = "POST";
	requestOptions.path = url.format({
		pathname: "/api/v" + this.options.version + '/payments'
	});

	this._makeRequest(requestOptions, requestBody, function(err, json) {
		if (err) {
			return next(err);
		}

		return next(null, json);
	});

};

Beanstream.prototype.preAuthorization = function(card, options, next) {

	if (!next || typeof next !== "function" || !options || typeof options !== "object" || !card || typeof card !== "object") {
		throw new Error("missing arguments");
	}

	card.complete = false;

	return Beanstream.prototype.cardPurchase.call(this, card, options, next);
};

Beanstream.prototype.cardPurchase = function(card, options, next) {

	if (!next || typeof next !== "function" || !options || typeof options !== "object" || !card || typeof card !== "object") {
		throw new Error("missing arguments");
	}

	var requiredFields;
	var error;

	requiredFields = ["name", "number", "expiry_month", "expiry_year"];

	if (!requiredFields.every(function(field) {
		return !!card[field];
	})) {
		error = new Error("Missing required fields in `card`");
		return next(error);
	}

	requiredFields = ["amount", "comments", "billing"];

	if (!requiredFields.every(function(field) {
		return !!options[field];
	})) {
		error = new Error("Missing required fields in `options`");
		return next(error);
	}

	var requestData = {
		merchant_id: options.merchant_id || this.merchant_id,
		order_number: options.order_number,
		amount: parseFloat(options.amount),
		language: options.language || "eng",
		customer_ip: options.customer_ip,
		term_url: options.term_url,
		comments: options.comments,
		billing: options.billing,
		payment_method: "card"
	};

	var exp_month;
	var exp_year;
	if (typeof card.expiry_month === "string") {
		exp_month = card.expiry_month;
	} else if (typeof card.expiry_month === "number") {
		exp_month = card.expiry_month < 10 ? "0" + card.expiry_month : card.expiry_month.toString();
	}

	if (typeof card.expiry_year === "string") {
		exp_year = card.expiry_year.length > 2 ? card.expiry_year.substr(-2) : card.expiry_year;
	} else if (typeof card.expiry_year === "number") {
		exp_year = card.expiry_year < 10 ? "0" + card.expiry_year : card.expiry_year.toString().substr(-2);
	}

	requestData.card = {
		complete: typeof card.complete !== "undefined" ? card.complete : true,
		name: card.name,
		number: card.number.toString(),
		expiry_month: exp_month,
		expiry_year: exp_year,
		cvd: card.cvd.toString()
	};

	return Beanstream.prototype._payments.call(this, requestData, next);
};

/*
=======
Pre-Auth Completion
=======
*/

Beanstream.prototype._paymentsCompletion = function(id, options, next) {

	options = options || {};
	var requestBody = JSON.stringify(options, null, '\t');

	for (var key in options) {
		if (typeof options[key] === "undefined") {
			delete options[key];
		}
	}

	var requestOptions = this.requestOptions();
	requestOptions.method = "POST";
	requestOptions.path = url.format({
		pathname: "/api/v" + this.options.version + '/payments/' + id + "/completions"
	});

	this._makeRequest(requestOptions, requestBody, function(err, json) {
		if (err) {
			return next(err);
		}

		return next(null, json);
	});

};

Beanstream.prototype.completePreAuthorization = function(id, options, next) {

	if (!next || typeof next !== "function" || !options || typeof options !== "object" || !id || typeof id !== "string") {
		throw new Error("missing arguments");
	}

	var requiredFields;
	var error;

	requiredFields = ["amount"];

	if (!requiredFields.every(function(field) {
		return !!options[field];
	})) {
		error = new Error("Missing required fields in `options`");
		return next(error);
	}

	var requestData = {
		order_number: options.order_number,
		amount: parseFloat(options.amount),
	};

	return Beanstream.prototype._paymentsCompletion.call(this, id, requestData, next);
};

/*
========
Payments Return
========
*/

Beanstream.prototype._return = function(id, options, next) {

	options = options || {};

	for (var key in options) {
		if (typeof options[key] === "undefined") {
			delete options[key];
		}
	}

	var requestBody = JSON.stringify(options, null, '\t');

	var requestOptions = this.requestOptions();
	requestOptions.method = "POST";
	requestOptions.path = url.format({
		pathname: "/api/v" + this.options.version + '/payments/' + id + "/returns"
	});

	this._makeRequest(requestOptions, requestBody, function(err, json) {
		if (err) {
			return next(err);
		}

		return next(null, json);
	});

};

Beanstream.prototype.return = function(id, options, next) {
	if (!next || typeof next !== "function" || !id || typeof id !== "string" || !options || typeof options !== "object") {
		throw new Error("missing arguments");
	}

	var requiredFields;
	var error;

	requiredFields = ["amount"];

	if (!requiredFields.every(function(field) {
		return !!options[field];
	})) {
		error = new Error("Missing required fields in `options`");
		return next(error);
	}

	var requestData = {
		merchant_id: options.merchant_id || this.merchant_id,
		order_number: options.order_number,
		amount: parseFloat(options.amount)
	};

	return Beanstream.prototype._return.call(this, id, requestData, next);
};


/*
========
Payments Void
========
*/

Beanstream.prototype._void = function(id, options, next) {

	options = options || {};
	var requestBody = JSON.stringify(options, null, '\t');

	for (var key in options) {
		if (typeof options[key] === "undefined") {
			delete options[key];
		}
	}

	var requestOptions = this.requestOptions();
	requestOptions.method = "POST";
	requestOptions.path = url.format({
		pathname: "/api/v" + this.options.version + '/payments/' + id + "/void"
	});

	this._makeRequest(requestOptions, requestBody, function(err, json) {
		if (err) {
			return next(err);
		}

		return next(null, json);
	});

};

Beanstream.prototype.void = function(id, options, next) {

	if (!next || typeof next !== "function" || !id || typeof id !== "string" || !options || typeof options !== "object") {
		throw new Error("missing arguments");
	}

	var requiredFields;
	var error;
	requiredFields = ["amount"];

	if (!requiredFields.every(function(field) {
		return !!options[field];
	})) {
		error = new Error("Missing required fields in `options`");
		return next(error);
	}

	var requestData = {
		merchant_id: options.merchant_id || this.merchant_id,
		order_number: options.order_number,
		amount: parseFloat(options.amount)
	};

	return Beanstream.prototype._void.call(this, id, requestData, next);
};

module.exports = Beanstream;