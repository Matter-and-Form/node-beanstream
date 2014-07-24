"use strict";

var assert = require("assert");

var Beanstream = require("../");//Beanstream Constructor;
var beanstream = new Beanstream(require("./credentials"));//new Beanstream instance;

var date = new Date();
date.setMonth(date.getMonth() + 2);//+1 for 0 index, +1 for next month;
date.setFullYear(date.getFullYear() + 1);
var exp_month = date.getMonth();
var exp_year = date.getFullYear();

/*
	Test cards provided by Beanstream;
*/

function testVISA() {
	return {
		name: "John Doe",
		number: "4012888888881881",//VISA
		expiry_month: exp_month,
		expiry_year: exp_year,
		cvd: "123"
	};
}

function testMC() {
	return {
		name: "John Doe",
		number: "5555555555554444",//MC
		expiry_month: exp_month,
		expiry_year: exp_year,
		cvd: "123"
	};
}

function testAMEX() {
	return {
		name: "John Doe",
		number: "370000000000002",//AMEX
		expiry_month: exp_month,
		expiry_year: exp_year,
		cvd: "1234"
	};
}

function newOrderNumber() {
	return (new Date()).getTime().toString();
}

function newOrderOptions() {
	return {
		order_number: newOrderNumber(),
		amount: 579.99,
		comments: "Test using the node-beanstream library",
		billing: {
			name: "Beanstream Internet Commerce",
			address_line1: "2659 Douglas Street.",
			address_line2: "#302",
			city: "Victoria",
			province: "BC",
			country: "CA",
			postal_code: "V8T 4M3",
			phone_number: "25047222326",
			email_address: "test@matterandform.net"
		}
	};
}

var _transactions = [];

var maxTimeout = 1e4;//10 seconds
var slowTime = 1e3;//1 second

describe('Beanstream', function() {

	describe("New Beanstream instance", function() {

		it('should return an instance of Beanstream using username + password', function() {
			var beanstreamInstance = new Beanstream({
				username: "USERNAME",
				password: "PASSWORD",
				merchant_id: "XXXXXXXXXXXXXXX"
			});
			assert.equal(true, beanstreamInstance instanceof Beanstream);
		});

		it('should return an instance of Beanstream using merchant_id + passcode', function() {
			var beanstreamInstance = new Beanstream({
				merchant_id: "00000000000000000",
				passcode: "XXXXXXXXXXXXXXXX"
			});
			assert.equal(true, beanstreamInstance instanceof Beanstream);
		});

		it('should throw an error when username, merchant_ids, passwords and/or passcodes are missing', function() {
			assert.throws(function() {
				//everything is missing
				new Beanstream();
			}, Error);

			assert.throws(function() {
				//merchant_id is missing
				new Beanstream({
					username: "sdadasda",
					password: "asdasdasda"
				});
			}, Error);

			assert.throws(function() {
				//not a valid argument type
				new Beanstream("username");
			}, Error);

			assert.throws(function() {
				//passcode is missing
				new Beanstream({
					merchant_id: "adasdihaisdh"
				});
			}, Error);
		});
	});

	describe('#cardPurchase()', function() {
		this.timeout(maxTimeout);
		this.slow(slowTime);

		it('should create a purchase with a VISA card', function(done) {
			var testCard = testVISA();
			var options = newOrderOptions();

			beanstream.cardPurchase(testCard, options, function(err, data) {
				_transactions.push(data);
				assert.equal(err, null);
				assert.ok(data);
				assert.equal("P", data.type);
				assert.equal("1", data.approved);
				done();
			});
		});

		it('should create a purchase with a Mastercard card', function(done) {
			var testCard = testMC();
			var options = newOrderOptions();

			beanstream.cardPurchase(testCard, options, function(err, data) {
				_transactions.push(data);
				assert.equal(err, null);
				assert.ok(data);
				assert.equal("P", data.type);
				assert.equal("1", data.approved);
				done();
			});
		});

		it('should create a purchase with an AMEX card', function(done) {
			var testCard = testAMEX();
			var options = newOrderOptions();

			beanstream.cardPurchase(testCard, options, function(err, data) {
				_transactions.push(data);
				assert.equal(err, null);
				assert.ok(data);
				assert.equal("P", data.type);
				assert.equal("1", data.approved);
				done();
			});
		});

		it('should create a pre-auth purchase with a VISA card using `cardPurchase`', function(done) {
			var testCard = testVISA();
			testCard.complete = false;
			var options = newOrderOptions();

			beanstream.cardPurchase(testCard, options, function(err, data) {
				_transactions.push(data);
				assert.equal(err, null);
				assert.ok(data);
				assert.equal("PA", data.type);
				assert.equal("1", data.approved);
				done();
			});
		});

	});

	var preauthId;
	var preAuthOrder;

	describe('#preAuthorization()', function() {
		this.timeout(maxTimeout);
		this.slow(slowTime);

		it('should create a pre-auth purchase with a VISA card using `preAuthorization`', function(done) {
			var testCard = testVISA();
			var options = newOrderOptions();
			preAuthOrder = options;

			beanstream.preAuthorization(testCard, options, function(err, data) {
				preauthId = data.id;
				_transactions.push(data);
				assert.equal(err, null);
				assert.ok(data);
				assert.equal("PA", data.type);
				assert.equal("1", data.approved);
				done();
			});
		});
	});

	describe('#completePreAuthorization()', function() {
		this.timeout(maxTimeout);
		this.slow(slowTime);

		it('should complete a pre-auth purchase', function(done) {

			var preAuthOptions = {
				order_number: preAuthOrder.order_number,
				amount: preAuthOrder.amount
			};

			beanstream.completePreAuthorization(preauthId, preAuthOptions, function(err, data) {
				_transactions.push(data);
				assert.equal(err, null);
				assert.ok(data);
				assert.equal("PAC", data.type);
				assert.equal("1", data.approved);
				done();
			});
		});
	});

	describe('#return()', function() {
		this.timeout(maxTimeout);
		this.slow(slowTime);

		it('should create a return transaction', function(done) {

			var options = {
				amount: 579.99
			};

			beanstream.return(_transactions.shift().id, options, function(err, data) {
				assert.equal(err, null);
				assert.ok(data);
				assert.equal("R", data.type);
				assert.equal("1", data.approved);
				done();
			});
		});

	});

	describe('#void()', function() {
		this.timeout(maxTimeout);
		this.slow(slowTime);

		it('should create a void transaction', function(done) {

			var options = {
				amount: 579.99
			};

			beanstream.void(_transactions.shift().id, options, function(err, data) {
				assert.equal(err, null);
				assert.ok(data);
				assert.equal("VP", data.type);
				assert.equal("1", data.approved);
				done();
			});
		});

	});
});
