$(document).ready(function() {
    var processes = new Array();
    var period = -1;
    var inputFile = NaN;

    window.onresize = function(evt) {
        if (period > 0) {
            //Update X-axis
            var width = d3.select("#progress-pb").node().getBoundingClientRect().width - 2;
            var margin = width / 0.98 * 0.01;
            var scaleX = d3.scaleLinear()
                .range([0, width])
                .domain([0, period]);
            var axisX = d3.axisBottom(scaleX).ticks(10);
            var $axisX = d3.selectAll(".g-axisX").attr("transform", "translate(" + margin + ", 0)").call(axisX);

            //Update tagMD
            width += 1;
            $('.g-MD').attr("transform", function(evt) {
                var margin = (width / 0.98 * 0.01) + width * ($(this).attr('time') / period) - 11;
                return "translate(" + margin + ", 0)";
            });
        }
    };

    $('#btnRead').on('click', function() {
        $('#btnSchedule').addClass('disabled');
        refreshUI();
        if (inputFile[0]) {
            let reader = new FileReader();
            reader.readAsText(inputFile[0], "UTF-8");
            reader.onload = handleFile;
        }
        else {      //Read default input
            let rawFile = new XMLHttpRequest();
            rawFile.open("GET", './input_default.txt');
            rawFile.onreadystatechange = function() {
                if (rawFile.readyState === 4) {
                    if (rawFile.status === 200 || rawFile.status == 0) {
                        let fileString = rawFile.responseText;
                        console.log(fileString);
                        loadData(fileString);
                    }
                }
            }
            rawFile.send();
        }
    });

    $('#inputFile').on('change', (function() {
        if ($('#inputFile').prop('files')[0])
            inputFile = $('#inputFile').prop('files');
        if (inputFile[0])
            $('#inputFile-label').html(inputFile[0].name);
    }));

    $('#btnSchedule').on('click', function() {
        if (!$('#btnSchedule').hasClass('disabled')) {
            refreshUI();
            $("#card-period-title").html('Period: ' + period);
            generateAxisX();
            schedule(0);
            schedule(1);
            schedule(2);
            $('[data-toggle="tooltip"]').tooltip();
        }
    });

    function handleFile(evt) {
        var fileString = evt.target.result;
        console.log(fileString);
        loadData(fileString);
    }

    function loadData(rawText) {
        processes = new Array();
        period = -1;
        var lines = rawText.split("\r\n");
        for (let i = 0; i < lines.length; i++) {
            let process = new Array();
            const line = lines[i].split(" ");
            process.push(line[0]);
            for (let j = 1; j < 4; j++)
                process.push(parseInt(line[j].split(":")[1]));
            processes.push(process);
        }

        //Get period
        var p = 0;
        processes.forEach(function(process) {
            process.push(shadeBlendConvert(p, "#007bff", "#DC3545"));
            if (process[2] > period)
                period = process[2];
            p += 1 / (processes.length - 1) * 0.8;
        });

        //Update UI
        var $cardPeriod = $("#card-period-title");
        $cardPeriod.html('Period: ' + period);
        generateAxisX();
        console.log("Period:\n\t" + period);

        //Check data
        if (period >= 0 && processes.length > 0) {
            $('#btnSchedule').removeClass('disabled');
        }
    }

    function schedule(mode) {
        var time = 0;
        var dispatch;
        var $progress;
        var $svgMD;
        var $spanMissDeadline;
        switch (mode) {
            case 0:
                console.log('Start-(Priority-based Scheduling)');
                dispatch = dispatch_pb;
                $progress = $("#progress-pb");
                $svgMD = d3.select('#svg-MD-pb');
                $spanMissDeadline = $("#span-missDeadline-pb");
                break;
            case 1:
                console.log('Start-(Rate Monotonic Scheduling)');
                dispatch = dispatch_rm;
                $progress = $("#progress-rm");
                $svgMD = d3.select('#svg-MD-rm');
                $spanMissDeadline = $("#span-missDeadline-rm");
                break;
            case 2:
                console.log('Start-(Earliest Deadline First Scheduling (EDF))');
                dispatch = dispatch_edf;
                $progress = $("#progress-edf");
                $svgMD = d3.select('#svg-MD-edf');
                $spanMissDeadline = $("#span-missDeadline-edf");
                break;
        }
        
        var ps = arrayCopy2D(processes).sort(function(a, b) {
            return a[2] - b[2];
        });

        //Miss deadline array
        var md = new Array();
        do {
            //Dispatch
            var process = dispatch(ps, time);

            //Idle process
            if (process.length <= 0) {
                process = ["idle", period - time, -1, -1, "#FFC107"];
            }

            var time_next = time + process[1]

            //Check deadline
            var isMD = false;
            var isEnd = false;
            for (let i = 0; i < ps.length; i++) {
                var proc = ps[i];

                //Check deadline
                if (time_next >= proc[2]) {
                    time_next = proc[2];

                    //Check end
                    // if (time_next == period && process[3] < 0) {
                    //     isEnd = true;
                    //     break;
                    // }

                    //Check miss deadline
                    if (proc[1] != 0) {
                        proc[1] = 0;
                        md.push(proc);
                        ps.splice(i, 1);
                        isMD = true;
                    }
                    else {
                        let proc_o = processes.find(function(p) {
                            return p[0] == proc[0];
                        });
                        proc[1] = proc_o[1];
                        proc[2] += proc_o[2];
                        ps.sort(function(a, b) {
                            return a[2] - b[2];
                        });
                        if (dispatch(ps, time)[0] == process[0]) {
                            time_next = time + process[1];
                        }
                    }
                    break;
                }
            }
            if (isEnd)
                break;
            process[1] -= (time_next - time);
            console.log(process[0] + " " + time + "-" + time_next);
            if (isMD) {
                console.log(proc[0] + ' miss deadline');
                //UI update (tagMD)
                var width = d3.select("#progress-pb").node().getBoundingClientRect().width - 1;
                var margin = (width / 0.98 * 0.01) + width * (time_next / period) - 11;
                let $gMD = $svgMD.filter('.svg-MD').append('g')
                    .attr('class', 'g-MD')
                    .attr('time', time_next)
                    .attr('transform', 'translate(' + margin + ', 0)')
                    .attr('data-toggle', 'tooltip')
                    .attr('data-placement', 'right')
                    .attr('title', proc[0] + ' miss deadline');
                $gMD.append('path')
                    .attr('fill', 'red')
                    .attr('stroke', '#000')
                    .attr('stroke-width', '1')
                    .attr('d', 'M11 27' +
                        'Q18.2 21 21 11' +
                        'A10 10 0 1 0 1 11' +
                        'Q3.8 21 11 27z');
                $gMD.append('text')
                    .attr('fill', '#ffffff')
                    .attr('font-size', '9')
                    .attr('font-family', 'Verdana')
                    .attr('x', '6')
                    .attr('y', '15')
                    .html(proc[0]);
            }

            //UI update (progress bar)
            let strBarStrip = (process[0] == 'idle') ? " progress-bar-striped text-dark font-weight-bold" : "";
            let strBorderRight = (time_next == period) ? "" : " border-right"
            var $progressBar = $('<div class="progress-bar text-uppercase' + strBorderRight + ' border-dark' + strBarStrip +
                '" role="progressbar" style="width: ' + 0 + '%; background-color:' + process[4] + ';" aria-valuenow="' + (time_next - time) / period * 100 +
                '" aria-valuemin="0" aria-valuemax="' + period + '" data-toggle="tooltip" data-placement="top" title="' + time + '-' + time_next + '">' + process[0] + '</div>');
            $progress.append($progressBar);

            $progressBar.css("width",
                function() {
                    return $(this).attr("aria-valuenow") + "%";
                }
            )

            //Time update
            time = time_next;
        } while (time < period)
        console.log('End');
        
        var strListMD = 'None';
        $badgeMD = $('<span class="badge border border-dark text-dark" style="background-color:' + '#fff' + ';">None</span>');
        if (md.length > 0) {
            strListMD = '';
            $badgeMD = $('<span></span>');
            md.forEach(function(mdp) {
                strListMD += mdp[0] + ',';
                $badgeMD.append($('<span class="badge border border-dark text-light" style="background-color:' + mdp[4] + ';">' + mdp[0] + '</span>'));
            });
            strListMD = strListMD.substring(0, strListMD.length-1);
        }
        $spanMissDeadline.append($badgeMD);
        console.log('Miss deadline: ' + strListMD + "\n\n");
    }

    function dispatch_pb(ps) {
        var process = new Array();
        var prd = -1;
        ps.forEach(function(proc) {
            if (proc[3] > prd && proc[1] > 0) {
                prd = proc[3];
                process = proc;
            }
        });
        return process;
    }

    function dispatch_rm(ps) {
        var process = new Array();
        var dl = period + 1;
        for (let i = 0; i < processes.length; i++) {
            let proc = ps.find(function(p) {
                return p[0] == processes[i][0];
            });

            if (proc && processes[i][2] < dl && proc[1] > 0) {
                dl = processes[i][2];
                process = proc;
            }
        }
        return process;
    }

    function dispatch_edf(ps, time) {
        var process = new Array();
        var pd = period + 1;
        ps.forEach(function(proc) {
            if (proc[2] - time < pd && proc[1] > 0) {
                pd = proc[2] - time;
                process = proc;
            }
        });
        return process;
    }

    function arrayCopy2D(target) {
        var ret = new Array();
        for (let i = 0; i < target.length; i++){
            ret[i] = new Array();
            for (let j = 0; j < target[i].length; j++){
                ret[i].push(target[i][j]);
            }
        }
        return ret;
    }

    function generateAxisX() {
        var width = d3.select("#progress-pb").node().getBoundingClientRect().width - 2;
        
        var margin = width / 0.98 * 0.01;

        var scaleX = d3.scaleLinear()
            .range([0, width])
            .domain([0, period]);

        var axisX = d3.axisBottom(scaleX).ticks(10);
        
        var $axisX = d3.selectAll(".axisX").append('svg')
            .attr('class', 'svg-axisX')  
            .attr("width", '100%')
            .attr("height", '30')
            .append('g')
            .attr('class', 'g-axisX')  
            .attr("transform", "translate(" + margin + ", 0)")
            .call(axisX);
    }

    function refreshUI() {
        $("#card-period-title").html("Period: 0");
        $('.progress-bar').remove();
        $('.g-MD').remove();
        $('.badge').remove();
        $('.svg-axisX').remove();
    }

    //By PimpTrizkit https://github.com/PimpTrizkit/PJs/wiki/12.-Shade,-Blend-and-Convert-a-Web-Color-(pSBC.js)
    const shadeBlendConvert = function(p, from, to) {
        if (typeof (p) != "number" || p < -1 || p > 1 || typeof (from) != "string" || (from[0] != 'r' && from[0] != '#') || (to && typeof (to) != "string")) return null; //ErrorCheck
        if (!this.sbcRip) this.sbcRip = (d) => {
            let l = d.length, RGB = {};
            if (l > 9) {
                d = d.split(",");
                if (d.length < 3 || d.length > 4) return null;//ErrorCheck
                RGB[0] = i(d[0].split("(")[1]), RGB[1] = i(d[1]), RGB[2] = i(d[2]), RGB[3] = d[3] ? parseFloat(d[3]) : -1;
            } else {
                if (l == 8 || l == 6 || l < 4) return null; //ErrorCheck
                if (l < 6) d = "#" + d[1] + d[1] + d[2] + d[2] + d[3] + d[3] + (l > 4 ? d[4] + "" + d[4] : ""); //3 or 4 digit
                d = i(d.slice(1), 16), RGB[0] = d >> 16 & 255, RGB[1] = d >> 8 & 255, RGB[2] = d & 255, RGB[3] = -1;
                if (l == 9 || l == 5) RGB[3] = r((RGB[2] / 255) * 10000) / 10000, RGB[2] = RGB[1], RGB[1] = RGB[0], RGB[0] = d >> 24 & 255;
            }
            return RGB;
        }
        var i = parseInt, r = Math.round, h = from.length > 9, h = typeof (to) == "string" ? to.length > 9 ? true : to == "c" ? !h : false : h, b = p < 0, p = b ? p * -1 : p, to = to && to != "c" ? to : b ? "#000000" : "#FFFFFF", f = this.sbcRip(from), t = this.sbcRip(to);
        if (!f || !t) return null; //ErrorCheck
        if (h) return "rgb" + (f[3] > -1 || t[3] > -1 ? "a(" : "(") + r((t[0] - f[0]) * p + f[0]) + "," + r((t[1] - f[1]) * p + f[1]) + "," + r((t[2] - f[2]) * p + f[2]) + (f[3] < 0 && t[3] < 0 ? ")" : "," + (f[3] > -1 && t[3] > -1 ? r(((t[3] - f[3]) * p + f[3]) * 10000) / 10000 : t[3] < 0 ? f[3] : t[3]) + ")");
        else return "#" + (0x100000000 + r((t[0] - f[0]) * p + f[0]) * 0x1000000 + r((t[1] - f[1]) * p + f[1]) * 0x10000 + r((t[2] - f[2]) * p + f[2]) * 0x100 + (f[3] > -1 && t[3] > -1 ? r(((t[3] - f[3]) * p + f[3]) * 255) : t[3] > -1 ? r(t[3] * 255) : f[3] > -1 ? r(f[3] * 255) : 255)).toString(16).slice(1, f[3] > -1 || t[3] > -1 ? undefined : -2);
    }
});