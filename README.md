# hasvi-backend
The AWS backend to the Hasvi IOT storage and visualisation software.

Hasvi (www.hasvi.com) is a storage and visualisation software package for Internet of Things (IOT) devices.

It consists of two parts:
- Hasvi-backend: The storage and visualisation of datastreams from IOT devices. It is designed to run on AWS.
- Hasvi-frontend: A Wordpress plugin for users to manage (add/edit/remove) their data streams.

## Installation and usage:
Hasvi-backend is run under node.js, typically within an AWS instance.

The data is stored in a DynamoDB database(s).

### Database Preperation:
1. Ensure hasvi-backend has read/write access to DynamoDB
2. Make the following tables in DynamoDB
  1. IOTData2 (Partition Key "hash" [string], Sort Key "datetime" [number])
  2. streams (Partition Key "hash" [string])
  3. useraccounts (Partition Key "username" [string])
  4. views (Partition Key "subURL" [string], Sort Key "username" [string])
3. Make the following Global Indexes
  1. "username-hash-index" in the streams table (Partition Key "username" [string], Sort Key "hash" [string])
  2. "username-subURL-index" in the views table (Partition Key "username" [string], Sort Key "subURL" [string])
  
### Installation and Running 
1. Define the following environmental variables:
  1. "awsregion" with name of the relevant AWS region that the database is running on (ie. "ap-southeast-2")
  2. "mode" with value "PRODUCTION" if running the non-debug version. Otherwise the debug version is used.
2. Running on AWS
  1. Upload a zipped copy of Hasvi-backend to an AWS instance
3. Running in Visual Studio (requires Node.js Tool for Visual Studio https://www.visualstudio.com/vs/node-js/)
  1. Open and run the project, ensuring the environmental variables in the project properties are set correctly
4. Running from the Linux commandline
  1. Ensure nodejs and npm are installed (https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions)
  2. Install the required libraries via `npm install` in the hasvi-backend directory
  3. run `nodejs Hasvi-App.js`
  
Hasvi-backend runs on port 3000 by default. It will be available on http://127.0.0.1:3000 if running locally

## Debug and Production Versions
Hasvi-backend has two modes: debug and production. The differences are:
- Different tables are used. If using the production databases defined in 2 and 3. Otherwise, the debug version will run. The debug version uses tables with the name "testing-" prepended on the tables (ie. "testing-streams").
- More verbose output on error messages in debug mode

The running mode can be ascertained by navigating to the root site (ie. http://data.hasvi.com) which displays the running version and if debug mode is running.

## Architecture
There are two parts to Hasvi: streams and views. In the below examples, `hasviurl` is the url of the Hasvi instance (ie. data.hasvi.com).

Streams are a timestamped series of data (ie. a from a temperature sensor) and are inserted via s http GET or POST request to http://hasviurl/insert?token=xxx&data=yyy, where `xxx` is a valid stream ID and `yyy` is the data to insert (integer number). A list of valid streams is stored in the streams table, along with the associated limits and properties.

The stream data itself is stored in the IOTData2 table.

Views are a visualisation of a particular stream. The visualisation can be text (csv, html) or graphical (chartjs, svg). They are called by a http GET request to http://hasviurl/views/username/stream, where `username` and `stream` are as per the entries in the views table.
