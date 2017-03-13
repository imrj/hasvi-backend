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
    var ExcelChart;

    before(function () {
        process.env.awsregion = 'ap-southeast-2';
        //The username we're using for the test account
        username = 'skldcbe';
        //The charts
        SVGChart = 'TRsvg.svg';
        ChartJSChart = ['TREmptyChartJS', 'TR1L2RChartJS', 'TR2L1RChartJS', 'TR1RBlankChartJS', 'TR1LBlankChartJS', 'TR1RChartJS', 'TR1LChartJS', 'TR1L2RBlankChartJS', 'TR2L1RBlankChartJS'];
        ChartJSChartError = [true, false, false, true, true, false, false, false, false];
        HTMLChart = ['TREmptyHtml', 'TR1L2RHtml', 'TR2L1RHtml', 'TR1RBlankHtml', 'TR1LBlankHtml', 'TR1RHtml', 'TR1LHtml', 'TR1L2RBlankHtml', 'TR2L1RBlankHtml'];
        HTMLChartError = [true, false, false, true, true, false, false, false, false];
        CSVChart = ['TREmptyCsv', 'TR1L2RCsv', 'TR2L1RCsv', 'TR1RBlankCsv', 'TR1LBlankCsv', 'TR1RCsv', 'TR1LCsv', 'TR1L2RBlankCsv', 'TR2L1RBlankCsv'];
        CSVChartError = [true, false, false, true, true, false, false, false, false];
        SVGChart = ['TREmptySvg', 'TR1L2RSvg', 'TR2L1RSvg', 'TR1RBlankSvg', 'TR1LBlankSvg', 'TR1RSvg', 'TR1LSvg', 'TR1L2RBlankSvg', 'TR2L1RBlankSvg'];
        SVGChartError = [true, false, false, true, true, false, false, false, false];
        ExcelChart = ['TREmptyXlsx', 'TR1L2RXlsx', 'TR2L1RXlsx', 'TR1RBlankXlsx', 'TR1LBlankXlsx', 'TR1RXlsx', 'TR1LXlsx', 'TR1L2RBlankXlsx', 'TR2L1RBlankXlsx'];
        ExcelChartError = [true, false, false, true, true, false, false, false, false];

        //Naming convention:
        //TREmpty = no streams in view
        //TR1L2R = 1 left stream, 2 right streams
        //TR2L1R = 2 left streams, 1 right stream
        //TR1RBlank = 1 right stream, no data in stream
        //TR1LBlank = 1 left stream, no data in stream
        //TR1R = 1 right stream
        //TR1L = 1 left stream
        //TR1L2RBlank = 1 left stream, 2 right streams (1 right stream has no data)
        //TR2L1RBlank = 1 right stream, 2 left streams (1 left stream has no data)

    });

    it('No view or username', function (done) {
        chai.request(server)
            .get('/views')
            .end(function (err, res) {
                expect(res).to.have.status(404);
                done();
            });
    });

    it('No view', function (done) {
        chai.request(server)
            .get('/views/' + username)
            .end(function (err, res) {
                expect(res).to.have.status(404);
                done();
            });
    });

    it('CSV', function (done) {
        var allDone = 0;
        for (index = 0; index < CSVChart.length; ++index) {
            if (CSVChartError[index] == false) {
                chai.request(server)
                    .get('/views/' + username + '/' + CSVChart[index] + '.csv')
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res).to.have.status(200);
                        expect(res).to.be.csv;
                        expect(res.text).to.contain('DateTime');
                        allDone++;

                        if (allDone == CSVChart.length)
                            done();
                    });
            }
            else {
                chai.request(server)
                    .get('/views/' + username + '/' + CSVChart[index] + '.csv')
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res).to.have.status(200);
                        expect(res).to.be.html;
                        expect(res.text).to.contain('Error');
                        allDone++;

                        if (allDone == CSVChart.length)
                            done();
                    });
            }
        }
    });

    it('CSV Bad extension', function (done) {
        chai.request(server)
            .get('/views/' + username + '/' + CSVChart[1] + '.csssv')
            .end(function (err, res) {
                expect(res).to.have.status(404);
                done();
            });
    });

    it('SVG', function (done) {
        var allDone = 0;
        for (index = 0; index < SVGChart.length; ++index) {
            if (SVGChartError[index] == false) {
                chai.request(server)
                    .get('/views/' + username + '/' + SVGChart[index] + '.svg')
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res).to.have.status(200);
                        allDone++;

                        if (allDone == SVGChart.length)
                            done();
                    });
            }
            else {
                chai.request(server)
                    .get('/views/' + username + '/' + SVGChart[index] + '.svg')
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res).to.have.status(200);
                        expect(res).to.be.html;
                        expect(res.text).to.contain('Error');
                        allDone++;

                        if (allDone == SVGChart.length)
                            done();
                    });
            }
        }
    });

    it('Excel', function (done) {
        var allDone = 0;
        for (index = 0; index < ExcelChart.length; ++index) {
            if (ExcelChartError[index] == false) {
                chai.request(server)
                    .get('/views/' + username + '/' + ExcelChart[index] + '.xlsx')
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res).to.have.status(200);
                        expect(res.header['content-disposition']).to.contain('attachment; filename="Data.xlsx"');
                        allDone++;

                        if (allDone == ExcelChart.length)
                            done();
                    });
            }
            else {
                chai.request(server)
                    .get('/views/' + username + '/' + ExcelChart[index] + '.xlsx')
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res).to.have.status(200);
                        expect(res).to.be.html;
                        expect(res.text).to.contain('Error');
                        allDone++;

                        if (allDone == ExcelChart.length)
                            done();
                    });
            }
        }
    });

    it('HTML', function (done) {
        var allDone = 0;
        for (index = 0; index < HTMLChart.length; ++index) {
            if (HTMLChartError[index] == false) {
                chai.request(server)
                    .get('/views/' + username + '/' + HTMLChart[index])
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res).to.have.status(200);
                        expect(res).to.be.html;
                        expect(res.text).to.contain('DateTime');
                        allDone++;

                        if (allDone == HTMLChart.length)
                            done();
                    });
            }
            else {
                chai.request(server)
                    .get('/views/' + username + '/' + HTMLChart[index])
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res).to.have.status(200);
                        expect(res).to.be.html;
                        expect(res.text).to.contain('Error');
                        allDone++;

                        if (allDone == HTMLChart.length)
                            done();
                    });
            }
        }
    });

    it('ChartJS', function (done) {
        var allDone = 0;
        for (index = 0; index < ChartJSChart.length; ++index) {
            if (ChartJSChartError[index] == false) {
                chai.request(server)
                    .get('/views/' + username + '/' + ChartJSChart[index])
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res).to.have.status(200);
                        expect(res).to.be.html;
                        expect(res.text).to.contain('var myChart = new Chart(ctx, {');
                        allDone++;

                        if (allDone == ChartJSChart.length)
                            done();
                    });
            }
            else {
                chai.request(server)
                    .get('/views/' + username + '/' + ChartJSChart[index])
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res).to.have.status(200);
                        expect(res).to.be.html;
                        expect(res.text).to.contain('Error');
                        allDone++;

                        if (allDone == ChartJSChart.length)
                            done();
                    });
            }
        }
    });

    it('OpenGraph Images (ChartJS)', function (done) {
        chai.request(server)
            .get('/thumbs/chartjsThumb.png')
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                done();
            });
    });

    it('OpenGraph Images (Html)', function (done) {
        chai.request(server)
            .get('/thumbs/htmlThumb.png')
            .end(function (err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                done();
            });
    });
});