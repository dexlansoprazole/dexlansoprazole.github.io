$(document).ready(function() {
    var limit, time = 0;
    var state;
    var inputFile = NaN;
    
    $('#btnRead').on('click', function() {
        if (inputFile[0]) {
            let reader = new FileReader();
            reader.readAsText(inputFile[0], "UTF-8");
            reader.onload = handleFile;
        }
        else {      //Read default input
            let rawFile = new XMLHttpRequest();
            rawFile.open("GET", 'input_default.txt');
            rawFile.onreadystatechange = function() {
                if (rawFile.readyState === 4) {
                    if (rawFile.status === 200 || rawFile.status == 0) {
                        fileString = rawFile.responseText;
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

    $('#btnStep').on('click', function() {
        run();
        showLog();
        updateUI();
    });

    $('#btnIO').on('click', function() {
        if (!$(this).hasClass('disabled')) {
            console.log("I/O Waiting");
            ioWait();
            showLog();
            updateUI();
        }
    });

    $('#btnIOComplete').on('click', function() {
        if (!$(this).hasClass('disabled')) {
            console.log("I/O Complete");
            ioComplete();
            showLog();
            updateUI();
        }
    });

    function dispatch() {
        if (!state.running[0]) {
            for (let i = 0; i < state.ready.length; i++) {
                let procRD = state.ready[i];

                if (procRD[1] != 0) {
                    state.running.push(procRD);
                    state.ready.splice(i, 1);

                    break;
                }
            }
        }
    }

    function run() {
        time++;
        if (state.running[0]) {
            let procRN = state.running[0];
            state.time++;
            procRN[1]--;
            
            //Process finished
            if (procRN[1] <= 0) {
                state.time = 0;
                exit();
                return;
            }

            //Over time limit
            if (state.time >= limit) {
                state.time = 0;
                state.ready.push(procRN);
                state.running.splice(0, 1);
                dispatch();
            }
        }
        else {
            dispatch();    
        }
    }

    function ioWait() {
        time++;
        state.time = 0;
        let procRN = state.running[0];
        state.waiting.push(procRN);
        state.running.splice(0, 1);
    }

    function ioComplete() {
        time++;
        state.time = 0;
        let procWT = state.waiting[0];
        state.ready.push(procWT);
        state.waiting.splice(0, 1);
        if (state.running[0])
            run();
        else
            dispatch();
    }

    function exit() {
        let procRN = state.running[0];

        if (procRN[1] == 0) {
            state.exit.push(procRN);
            state.running.splice(0, 1);
        }
        dispatch();
    }

    function showLog() {
        console.log("Time Global:\n\t" + time);
        console.log("Time:\n\t" + state.time);
        console.log("Ready:\n\t" + state.ready);
        console.log("Waiting:\n\t" + state.waiting);
        console.log("Running:\n\t" + state.running);
        console.log("Exit:\n\t" + state.exit);
        console.log("--------------------------------");
    }

    function updateUI() {
        var $stateReady = $("#state-ready");
        var $stateWaiting = $("#state-waiting");
        var $stateRunning = $("#state-running");
        var $stateExit = $("#state-exit");
        var $btnIO = $("#btnIO");
        var $btnIOComplete = $("#btnIOComplete");
        var $btnStep = $("#btnStep");
        var $cardTime = $("#card-time-title");
        var $cardLimit = $("#card-limit-title");

        $('.process').remove();

        $cardTime.html("Time: " + time);
        $cardLimit.html("Limit: " + (limit - state.time));

        state.ready.forEach(proc => {
            $stateReady.append(
                '<div class="card process justify-content-center" id="proc-' + proc[0] + '">' +
                '<h1>' + proc[0] + '[' + proc[1] + ']</h1>' +
                '</div>'
            );
        });

        state.waiting.forEach(proc => {
            $stateWaiting.append(
                '<div class="card process justify-content-center" id="proc-' + proc[0] + '">' +
                '<h1>' + proc[0] + '[' + proc[1] + ']</h1>' +
                '</div>'
            );
        });

        state.running.forEach(proc => {
            $stateRunning.append(
                '<div class="card process justify-content-center" id="proc-' + proc[0] + '">' +
                '<h1>' + proc[0] + '[' + proc[1] + ']</h1>' +
                '</div>'
            );
        });

        state.exit.forEach(proc => {
            $stateExit.append(
                '<div class="card process justify-content-center" id="proc-' + proc[0] + '">' +
                '<h1>' + proc[0] + '[' + proc[1] + ']</h1>' +
                '</div>'
            );
        });

        if (state.waiting[0])
            $btnIOComplete.removeClass('disabled');
        else
            $btnIOComplete.addClass('disabled');
        
        if (state.running[0]) {
            $btnIO.removeClass('disabled');
            //$btnStep.removeClass('disabled');
        }
        else {
            $btnIO.addClass('disabled');
            //$btnStep.addClass('disabled');
        }
            
        
    }

    function loadData(rawText) {
        state = {time: 0, ready: new Array(), waiting: new Array(), running: new Array(), exit: new Array()};
        limit = 0;
        time = 0;
        var lines = rawText.split("\r\n");
        var processes = new Array();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].split(" ");
            if (i == 0)
                limit = line[1];
            else
                processes.push(line);
        }
        state.ready = processes;

        dispatch();
        showLog();
        updateUI();
    }

    function handleFile(evt) {
        var fileString = evt.target.result;
        console.log(fileString);
        loadData(fileString);
    }
});