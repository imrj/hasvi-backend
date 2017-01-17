var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../Hasvi-Backend');
var should = chai.should();
var expect = require('chai').expect;

chai.use(chaiHttp);

describe('Visualisation Out - ', function () {
    var username;
    var SVGChart;
    var CSVChart;
    var HTMLChart;
    var ChartJSChart;

    before(function () {
        process.env.awsregion = 'ap-southeast-2';
        //The username we're using for the test account
        username = 'skldcbe';
        //The charts
        SVGChart = 'TRsvg.svg';
        CSVChart = 'TScsv.csv';
        HTMLChart = 'TRhtml.html';
        ChartJSChart = 'TRChartjs';

    });

    it('No view or username', function (done) {
        chai.request(server)
            .get('/views')
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(404);
                done();
            });
    });

    it('No view', function (done) {
        chai.request(server)
            .get('/views/' + username)
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(404);
                done();
            });
    });

    it('CSV', function (done) {
        chai.request(server)
            .get('/views/' + username + '/' + CSVChart)
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res).to.be.csv;
                expect(res.text).to.contain('DateTime');
                expect(res.text).to.contain('Value');
                done();
            });
    });

    it('CSV Bad extension', function (done) {
        chai.request(server)
            .get('/views/' + username + '/' + CSVChart + '.html')
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(404);
                done();
            });
    });

    it('SVG', function (done) {
        chai.request(server)
            .get('/views/' + username + '/' + SVGChart)
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res).to.be.svg;
                done();
            });
    });

    it('HTML', function (done) {
        chai.request(server)
            .get('/views/' + username + '/' + HTMLChart)
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res).to.be.html;
                expect(res.text).to.contain('DateTime');
                expect(res.text).to.contain('Value');
                done();
            });
    });

    it('ChartJS', function (done) {
        chai.request(server)
            .get('/views/' + username + '/' + ChartJSChart)
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res).to.be.html;
                expect(res.text).to.contain('var myChart = new Chart(ctx, {');
                done();
            });
    });
});