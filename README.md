# Node-Beanstream

A Node.JS library for communicating with the Beanstream API.

Currently only supports these actions of the Transactions API:

- Card Purchase & Pre-Authorization
- Return
- Pre-Authorization Completion
- Void Purchase & Void Return

## Installation

	npm install --save beanstream
	
## Usage

### Constructor

	var Beanstream = require("beanstream");
	var beanstream = new Beanstream(options);
	
- `options` _object_
	- `merchant_id` _string_
	- `passcode` _string_
	- `username` _string_
	- `password` _string_
	- `version` _number_ / _string_; optional, defaults to `1`
	
Credentials for authenticating with Beanstream. Provide `username` + `password`, or `merchant_id` + `passcode`. `merchant_id` is required regardless.

### cardPurchase

	beanstream.cardPurchase(card, order, callback);
	
- `card` _object_
	- see [Card Object](#Card-Object)
- `order` _object_
	- see [Order Object](#Card-Object)
- `callback` _function_
	- `callback` gets passed two arguments: `error` and `data`. Data contains to JSON response from Beanstream.

### preAuthorization

	beanstream.preAuthorization(card, order, callback);
	
- `card` _object_
	- see [Card Object](#Card-Object)
- `order` _object_
	- see [Order Object](#Card-Object)
- `callback` _function_
	- `callback` gets passed two arguments: `error` and `data`. Data contains to JSON response from Beanstream.
	
This creates a pre-auth charge by automatically setting `card.complete` to `false`. See [completePreAuthorization](#completePreAuthorization) for completing the pre-auth transaction.

### completePreAuthorization

	beanstream.completePreAuthorization(transaction_id, options, callback);
	
- `transaction_id` _string_
- `options` _object_
	- `amount` _number_
	- order_number _string_; optional
- `callback` _function_
	- `callback` gets passed two arguments: `error` and `data`. Data contains to JSON response from Beanstream.

This completes a pre-auth charge.

### return

	beanstream.return(transaction_id, options, callback);
	
- `transaction_id` _string_
- `options` _object_
	- `amount` _number_
	- order_number _string_; optional
- `callback` _function_
	- `callback` gets passed two arguments: `error` and `data`. Data contains to JSON response from Beanstream.

This creates a return transaction.

### void

	beanstream.void(transaction_id, options, callback);
	
- `transaction_id` _string_
- `options` _object_
	- `amount` _number_
	- order_number _string_; optional
- `callback` _function_
	- `callback` gets passed two arguments: `error` and `data`. Data contains to JSON response from Beanstream.

This creates a void transaction.


## Objects

### Card Object
	
- `complete` _boolean_; optional, defaults to `true`
- `name` _string_
- `number` _string_
- `expiry_month` _number_ / _string_
- `expiry_year` _number_ / _string_
- `cvd` _string_

### Order Object

- `order_number` _string_,
- `amount` _number_,
- `comments` _string_; optional
- `billing` _object_; optional
	- `name` "Beanstream Internet Commerce",
	- `address_line1` _string_
	- `address_line2` _string_; optional
	- `city` _string_
	- `province` _string_
	- `country` _string_
	- `postal_code` _string_
	- `phone_number` _string_
	- `email_address` _string_
- `language` _string_; optional, defaults to `"eng"`
- `customer_ip`: _string_; optional
- `term_url` _string_; optional
	
## Tests

Follow the instructions in `test/credentials_template.js`, then run tests with `npm test`