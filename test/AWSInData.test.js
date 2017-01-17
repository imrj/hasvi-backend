var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../Hasvi-Backend');
var should = chai.should();
var expect = require('chai').expect;

chai.use(chaiHttp);

it('Get index page', function (done) {
    chai.request(server)
        .get('/')
        .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res).to.be.html;
            expect(res.text).to.contain('This is the index page for Hasvi-Backend');
            done();
        });
});

describe('DataIn - ', function () {
    var TestRunnerToken;
    var TestRunnerSlow;
    var TestRunnerFull;

    before(function () {
        process.env.awsregion = 'ap-southeast-2';
        //Note this token has limits of -20 and 100
        TestRunnerToken = '278ger1zhztyvs556w1a';
        //For testing the refresh cycle. This token has a 1 min min update limit
        TestRunnerSlow = 'pwevb5298br8923';
        //For testing the trimming of a full stream
        TestRunnerFull = 'p9bn89235nd43';
    });

    it('Insert Good Value', function (done) {   
        chai.request(server)
            .get('/insertData?token=' + TestRunnerToken + '&data=' + '34')
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res).to.be.html;
                expect(res.text).to.contain('Success');
                done();
            });
    });

    it('Bad Token', function (done) {
        chai.request(server)
            .get('/insertData?token=' + TestRunnerToken + 'er&data=' + '34')
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res).to.be.html;
                expect(res.text).to.contain('Invalid token');
                done();
            });
    });

    it('No Data', function (done) {
        chai.request(server)
            .get('/insertData?token=' + TestRunnerToken)
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res).to.be.html;
                expect(res.text).to.contain('Not enough arguments');
                done();
            });
    });

    it('No Token', function (done) {
        chai.request(server)
            .get('/insertData?data=' + '45')
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res).to.be.html;
                expect(res.text).to.contain('Not enough arguments');
                done();
            });
    });

    it('No Token or data', function (done) {
        chai.request(server)
            .get('/insertData')
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res).to.be.html;
                expect(res.text).to.contain('Not enough arguments');
                done();
            });
    });

    it('Bad Data', function (done) {
        chai.request(server)
            .get('/insertData?token=' + TestRunnerToken + '&data=' + 'dfty344')
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res).to.be.html;
                expect(res.text).to.contain('Invalid token');
                done();
            });
    });

    it('Data under min', function (done) {
        chai.request(server)
            .get('/insertData?token=' + TestRunnerToken + '&data=' + '-30')
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res).to.be.html;
                expect(res.text).to.contain('Value outside limits');
                done();
            });
    });

    it('Data over max', function (done) {
        chai.request(server)
            .get('/insertData?token=' + TestRunnerToken + '&data=' + '101')
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res).to.be.html;
                expect(res.text).to.contain('Value outside limits');
                done();
            });
    });

    it('Min Refresh cycle', function (done) {
        chai.request(server)
            .get('/insertData?token=' + TestRunnerSlow + '&data=' + '67')
            .end(function (err, res) {
                chai.request(server)
                    .get('/insertData?token=' + TestRunnerSlow + '&data=' + '67')
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res).to.have.status(200);
                        expect(res).to.be.html;
                        expect(res.text).to.contain('Min refresh time not expired');
                        done();
                    });
                done();
            });
    });

    it('Full Stream', function (done) {
        chai.request(server)
            .get('/insertData?token=' + TestRunnerFull + '&data=' + '45')
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res).to.be.html;
                expect(res.text).to.contain('Success over limit');
                done();
            });
    });
});
