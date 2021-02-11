// ==UserScript==
// @name         Sprechwuensche anzeigen
// @version      2.3.0
// @author       Allure149
// @description  Zeigt Sprechwuensche aller Einsaetze an
// @include      *://leitstellenspiel.de/*
// @include      *://www.leitstellenspiel.de/*
// @grant        none
// ==/UserScript==
/* global $,user_id */

(async function() {
    'use strict';

    if(!localStorage.aAlliance || JSON.parse(localStorage.aAlliance).lastUpdate < (new Date().getTime() - 5 * 1000 * 60)) {
        await $.getJSON("/api/allianceinfo").done(function(data) {
            localStorage.setItem('aAlliance', JSON.stringify({lastUpdate: new Date().getTime(), value: data}));
        });
    }
    var aAlliance = JSON.parse(localStorage.aAlliance).value;
    var icke = aAlliance.users.filter((e)=>e.id==user_id)[0];
    var rolesToCheck = ["Sprechwunsch-Admin","Verbands-Co-Admin","Verbands-Admin"];
    if(!icke.roles.some((e)=>rolesToCheck.includes(e))) return false;
    //if(!icke.roles.includes("Sprechwunsch-Admin","Verbands-Co-Admin","Verbands-Admin")) return false;

    if (!window.sessionStorage.hasOwnProperty('aMissions') || JSON.parse(window.sessionStorage.aMissions).lastUpdate < (new Date().getTime() - 5 * 1000 * 60)){
        await $.getJSON('/einsaetze.json').done(function(data){
            localStorage.aMissions = JSON.stringify({lastUpdate: new Date().getTime(), value: data});
        });
    }

    $("head").append(`<style>
                             .modal {
                                 display: none;
                                 position: fixed; /* Stay in place front is invalid - may break your css so removed */
                                 padding-top: 100px;
                                 left: 0;
                                 right:0;
                                 top: 0;
                                 bottom: 0;
                                 overflow: auto;
                                 background-color: rgb(0,0,0);
                                 background-color: rgba(0,0,0,0.4);
                                 z-index: 9999;
                             }
                             .modal-body{
                                 height: 650px;
                                 overflow-y: auto;
                             }
                      </style>`);
    $("#btn-group-mission-select").before(`<a href="#"
                                              class="btn btn-xs btn-warning"
                                              id="showMissionRequests"
                                              data-toggle="modal"
                                              data-target="#saShowMissions"
                                           >
                                               <div class="glyphicon glyphicon-bullhorn"></div>
                                           </a>`);

    //$("#btn-group-mission-select")
    $("body")
        .prepend(`<div class="modal fade"
                     id="saShowMissions"
                     tabindex="-1"
                     role="dialog"
                     aria-labelledby="exampleModalLabel"
                     aria-hidden="true"
                >
                    <div class="modal-dialog modal-lg" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="exampleModalLabel">
                                    Wo sind aktuell Sprechwünsche offen?
                                </h5>
                                <div class="btn-group">
                                    <a class="btn btn-xs btn-default" id="saDoMissionRequests">Sprechwunschliste laden</a>
                                </div>
                                <button type="button"
                                        class="close"
                                        data-dismiss="modal"
                                        aria-label="Close"
                                >
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div class="modal-body" id="saBody"></div>
                            <div class="modal-footer">
                                <div class="pull-left">
                                    Legende:
                                    <span class="alert alert-warning" style="padding: 2px 5px; margin:0 5px;">Patienten</span>
                                    <span class="alert alert-success" style="padding: 2px 5px; margin:0 5px;">Gefangene</span>
                                    <span class="alert alert-danger" style="padding: 2px 5px; margin:0 5px;">beides</span>
                                    <span class="alert alert-info" style="padding: 2px 5px; margin:0 5px;">Einsatz älter als 3 bzw. 12 Stunden</span>
                                    <span class="alert" style="padding: 2px 5px; margin:0 5px; background-color: #e5e8e8;">
                                        <div class="glyphicon glyphicon-road"></div> Sprechwünsche bearbeiten
                                    </span>
                                </div><br/>
                                <div class="pull-left" style="margin-top: 5px">
                                    <span class="alert" style="padding: 2px 5px; margin:0 5px; background-color: #e5e8e8;">
                                        <div class="glyphicon glyphicon-home"></div> normaler Einsatz
                                    </span>
                                    <span class="alert" style="padding: 2px 5px; margin:0 5px; background-color: #e5e8e8;">
                                        <div class="glyphicon glyphicon-eur"></div> Coin-Einsatz
                                    </span>
                                    <span class="alert" style="padding: 2px 5px; margin:0 5px; background-color: #e5e8e8;">
                                        <div class="glyphicon glyphicon-plus"></div> reiner RD-Einsatz
                                    </span>
                                    <span class="alert" style="padding: 2px 5px; margin:0 5px; background-color: #e5e8e8;">
                                        <div class="glyphicon glyphicon-star"></div> Event-Einsatz
                                    </span>
                                    <span class="alert" style="padding: 2px 5px; margin:0 5px; background-color: #e5e8e8;">
                                        <div class="glyphicon glyphicon-ok"></div> Einsatz erledigt
                                    </span>
                                </div>
                                v${GM_info.script.version}
                                <button type="button"
                                        id="saCloseButton"
                                        class="btn btn-secondary"
                                        data-dismiss="modal"
                                >
                                    Schließen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`);

    function saCreateTable(arrSaMissions){
        $("#saTable").remove();
        let strOutput = `<table id="saTable" class="table">
                             <tr id="saTableHead">
                                 <th class="col-4">Einsatzbezeichnung</th>
                                 <th class="col-4">Einsatzadresse</th>
                                 <th class="col-3">Einsatzbeginn</th>
                                 <th class="col">SW</th>
                                 <th class="col"></th>
                             </tr>`;
        let statusVal = -1;

        for(let i = 0; i < arrSaMissions.length; i++){
            switch(arrSaMissions[i].status){
                case 0: statusVal = "warning"
                    break;
                case 1: statusVal = "success"
                    break;
                case 2: statusVal = "danger"
                    break;
                default: statusVal = "default";
            }

            strOutput += `<tr class="alert alert-${statusVal}" id="saTr_${arrSaMissions[i].missionId}">
                              <td class="col-xs-4"><div id="saMissionSign_${arrSaMissions[i].missionId}" class="glyphicon glyphicon-question-sign"></div> ${arrSaMissions[i].missionName}</td>
                              <td class="col-xs-3">${arrSaMissions[i].missionAdress}</td>
                              <td id="missionTime_${arrSaMissions[i].missionId}">
                                  ${arrSaMissions[i].missionTime}
                              </td>
                              <td id="countSw_${arrSaMissions[i].missionId}">?</td>
                              <td class="col-xs-2">
                                  <div class="btn-group">
                                      <a href="/missions/${arrSaMissions[i].missionId}"
                                         class="btn btn-default btn-xs lightbox-open"
                                         id="sa_alarm_button_${arrSaMissions[i].missionId}">
                                          Anzeigen
                                      </a>
                                      <a mission_id="${arrSaMissions[i].missionId}"
                                         class="btn btn-default btn-xs saByePatient">
                                          <div class="glyphicon glyphicon-road"></div>
                                      </a>
                                  </div>
                              </td>
                          </tr>`;
        }
        strOutput += "</table>";

        return strOutput;
    }

    let missionsDone = [];

    function saDoWork(){
        let speakRequest = [];
        missionsDone = [];

        $("#mission_list_alliance > .missionSideBarEntry, #mission_list_alliance_event > .missionSideBarEntry").each(function() {
            let $this = $(this);
            if($this.hasClass("mission_deleted")) return true;

            let missionId = $this.attr("mission_id");
            let requestPrisoners = $this.find("#mission_prisoners_" + missionId).text();
            let requestPatients = $this.find("#mission_patients_" + missionId).text();
            let requestText = $this.find("#mission_missing_short_" + missionId).text();
            let missionAdress = $this.find("#mission_address_" + missionId).text() == "" ? "unbekannt" : $this.find("#mission_address_" + missionId).text();
            let regexMissionName = new RegExp(/\[.*\](.*?),/gm);
            let missionName = $this.find("#mission_caption_" + missionId).text().match(regexMissionName) == null ?
                $this.find("#mission_caption_" + missionId).text() : $this.find("#mission_caption_" + missionId).text().match(regexMissionName)[0];
            let missionOrigin = missionName.indexOf("Event") >= 0 ? "Event" : "Verband";

            missionName = missionName.replace("[Verband] ", "").replace("[Event] ", "").replace(",", "");

            let status = -1; // status 0 = nur Patienten, 1 = nur Gefangene, 2 = Gefangene und Patienten

            if(requestText.indexOf("Sprechwunsch") >= 0) {
                if(requestPatients && requestPrisoners) {
                    status = 2;
                } else if(requestPatients) {
                    status = 0;
                } else if(requestPrisoners) {
                    status = 1;
                } else {
                    status = -1;
                }

                speakRequest.push({"missionId": missionId,
                                   "missionName": missionName,
                                   "missionAdress": missionAdress,
                                   "status": status,
                                   "missionTime": "Lade...",
                                   "missionOrigin": missionOrigin
                                  });
            }
        });

        if($('#saWorkMissionRequests').length > 0) $('#saWorkMissionRequests').remove();

        let createFilterButtons = `0 von ${speakRequest.length} Einsätzen geladen.`;

        $("#saBody").html(`<div id="saFilters">${createFilterButtons}</div>${saCreateTable(speakRequest)}`);

        let monthsWord = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
        let monthsNumber = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
        let getYear = new Date().getFullYear();

        let loadElementsToGo = 0;

        $.each(speakRequest, function(key, item){
            setTimeout(function(){
                requestMissionTime(item.missionId).done(function(result){
                    let actMissionId = item.missionId;
                    let $this = $(result);
                    let missionTime = $this.find("#missionH1").attr("title").replace("Einsatz eingegangen: ", "");
                    let isoTime = "";
                    let missionTimeDone = false;

                    for(let i = 0; i < monthsWord.length; i++){
                        if(missionTime.indexOf(monthsWord[i]) >= 0) {
                            missionTime = missionTime.replace(" " + monthsWord[i], monthsNumber[i] + "." + getYear);
                            let missionTimeLength = missionTime.length;
                            isoTime = new Date(getYear,
                                               missionTime.slice(3, 5) - 1,
                                               missionTime.slice(0, 2),
                                               missionTime.slice(missionTimeLength - 9, missionTimeLength - 7),
                                               missionTime.slice(missionTimeLength - 6, missionTimeLength - 4),
                                               "00"
                                              );

                            let actualDate = new Date();
                            let calcDifference = actualDate.getTime() - isoTime.getTime();

                            let missionType = [];
                            if($this.find("#mission_help").length) missionType = $this.find("#mission_help").attr("href").replace("/einsaetze/","").split("?");
                            else missionType[0] = -1;

                            let checkIsAllianceMission = isAllianceMission(missionType[0]);
                            if(checkIsAllianceMission) item.missionOrigin = "Coin";

                            let checkMissionAmbulanceOnly = isAmbulanceOnly(missionType[0]);
                            if(checkMissionAmbulanceOnly) item.missionOrigin = "RD";

                            if((calcDifference >= 10800000 && !checkIsAllianceMission) || (checkIsAllianceMission && calcDifference >= 43200000) || checkMissionAmbulanceOnly){
                                $("#sa_alarm_button_" + actMissionId).toggleClass("btn-default btn-info");
                                missionTimeDone = true;
                            };

                            let timeSinceStart = calcDifference / 1000;
                            let hoursSinceStart = Math.floor(timeSinceStart / 3600);
                            let minsSinceStart = Math.floor(timeSinceStart / 60) - (hoursSinceStart * 60);

                            $("#missionTime_" + actMissionId).html(`${missionTime.replace(" Uhr", "")}<br/>vor ${(hoursSinceStart < 10 ? "0" + hoursSinceStart : hoursSinceStart)}h ${(minsSinceStart < 10 ? "0" + minsSinceStart : minsSinceStart)}m`);
                            //$("#missionTime_" + item.missionId).html(`<span title="vor ${(hoursSinceStart < 10 ? "0" + hoursSinceStart : hoursSinceStart)}h ${(minsSinceStart < 10 ? "0" + minsSinceStart : minsSinceStart)}m">${missionTime.replace(" Uhr", "")}</span>`);

                            $("#countSw_" + item.missionId).text($this.find(".building_list_fms_5").length);

                            let missionInProgress = $this.find("#mission_bar_" + actMissionId + " > div").hasClass("progress-striped-inner-active");
                            let patientInProgress = false;
                            $this.find(".mission_patient").each(function(){
                                if($(this).find("[id^='mission_patients']").css("width") !== "0%") patientInProgress = true;
                            });
                            let missionWidth = $this.find("#mission_bar_" + actMissionId).css("width");

                            if(missionTimeDone || item.missionOrigin == "RD") missionsDone.push(actMissionId);

                            if((missionWidth == "0%" && !patientInProgress) || checkMissionAmbulanceOnly){
                                $("#countSw_" + item.missionId).append(` <div class="glyphicon glyphicon-ok"></div>`);
                            }

                            let setMissionGlyhicon = "";
                            switch(item.missionOrigin){
                                case "Event": setMissionGlyhicon = "glyphicon-star";
                                    break;
                                case "Coin": setMissionGlyhicon = "glyphicon-eur";
                                    break;
                                case "RD": setMissionGlyhicon = "glyphicon-plus";
                                    break;
                                default: setMissionGlyhicon = "glyphicon-home";
                            }

                            $("#saMissionSign_" + actMissionId).toggleClass("glyphicon-question-sign " + setMissionGlyhicon);
                            break;
                        }
                    }

                    loadElementsToGo++;
                    $("#saFilters").text(`${loadElementsToGo} von ${speakRequest.length} Einsätzen geladen.`);

                    if($('#saWorkMissionRequests').length == 0) $('#saDoMissionRequests').after(`<a class="btn btn-xs btn-danger" id="saWorkMissionRequests">Sprechwünsche bearbeiten</a>`);

                    if(speakRequest.length == loadElementsToGo) {
                        $("#saFilters").html(`Filter: <div class="btn-group">
                                                          <div class="btn btn-xs btn-success" id="saFilterNormal"><div class="glyphicon glyphicon-home"></div></div>
                                                          <div class="btn btn-xs btn-success" id="saFilterCoin"><div class="glyphicon glyphicon-eur"></div></div>
                                                          <div class="btn btn-xs btn-success" id="saFilterAmublance"><div class="glyphicon glyphicon-plus"></div></div>
                                                          <div class="btn btn-xs btn-success" id="saFilterEvent"><div class="glyphicon glyphicon-star"></div></div>
                                                      </div>`);
                    }
                });
            }, key * 500);
        });
    }

    function isAmbulanceOnly(missionType){
        var missionRequirements = JSON.parse(localStorage.aMissions).value.filter(e => e.id == missionType)[0];
        return missionRequirements === undefined ? false : (missionRequirements.average_credits == null) ? true : false;
    }

    function isAllianceMission(missionType){
        var missionRequirements = JSON.parse(localStorage.aMissions).value.filter(e => e.id == missionType)[0];
        return missionRequirements === undefined ? true : (missionRequirements.additional.only_alliance_mission) ? true : false;
    }

    function requestMissionTime(missionId){
        return $.ajax({
            url: "/missions/" + missionId,
            method: "GET"
        });
    }

    let filterNormalActive = false;
    let filterCoinActive = false;
    let filterAmbulanceActive = false;
    let filterEventActive = false;

    function filterMissions(filterOption){
        let activeFilter, resetFilter;
        if(filterOption.endsWith("only")) resetFilter = true;

        switch(filterOption){
            case "home":
                if(filterNormalActive) filterNormalActive = false;
                else filterNormalActive = true;
                activeFilter = filterNormalActive;
                break;
            case "eur":
                if(filterCoinActive) filterCoinActive = false;
                else filterCoinActive = true;
                activeFilter = filterCoinActive;
                break;
            case "plus":
                if(filterAmbulanceActive) filterAmbulanceActive = false;
                else filterAmbulanceActive = true;
                activeFilter = filterAmbulanceActive;
                break;
            case "star":
                if(filterEventActive) filterEventActive = false;
                else filterEventActive = true;
                activeFilter = filterEventActive;
                break;
        }

        $("#saTable >> tr").each(function(){
            let rowHasClass = $(this).find("[id^='saMissionSign_']").hasClass("glyphicon-" + filterOption);

            if(rowHasClass && $(this).attr("id") !== "saTableHead") {
                if(activeFilter) $(this).css("display", "none");
                else $(this).removeAttr("style");
            }
        });
    }

    //single click
    $("body").on("click", "#saFilterNormal", function(){
        filterMissions("home");
        $("#saFilterNormal").toggleClass("btn-danger btn-success");
    });

    $("body").on("click", "#saFilterCoin", function(){
        filterMissions("eur");
        $("#saFilterCoin").toggleClass("btn-danger btn-success");
    });

    $("body").on("click", "#saFilterAmublance", function(){
        filterMissions("plus");
        $("#saFilterAmublance").toggleClass("btn-danger btn-success");
    });

    $("body").on("click", "#saFilterEvent", function(){
        filterMissions("star");
        $("#saFilterEvent").toggleClass("btn-danger btn-success");
    });

    $("body").on("click", "#saDoMissionRequests", function(){
        saDoWork();
    });

    $("body").on("click", "#showMissionRequests", function(){
        saDoWork();
    });

    $('body').on('click', '.saByePatient', function(){
        var missionId = $(this).attr('mission_id');

        $.get('/missions/'+missionId).done(function(res){
            var $response = $(res);

            $.post("/missions/"+missionId+"/gefangene/entlassen");

            $('.building_list_fms_5', $response).each(function(){
                var $this = $(this).parent().parent();
                var vehicleId = $('td:nth-child(2) a', $this).attr('href').replace('/vehicles/','');

                $.get('/vehicles/'+vehicleId+'/patient/-1').done(function(){
                    $('#saTr_'+missionId).remove();
                });
            });
        });
    });

    var getMissionVehicles = (url, callback) => $.get(url, callback);

    $('body').on('click', '#saWorkMissionRequests', async function(){
        for(let i = 0; i < missionsDone.length; i++){
            var missionId = missionsDone[i];

            var res = await getMissionVehicles('/missions/'+missionId);
            var $response = $(res);

            $.post("/missions/"+missionId+"/gefangene/entlassen");

            $('.building_list_fms_5', $response).each(function(){
                var $this = $(this).parent().parent();
                var vehicleId = $('td:nth-child(2) a', $this).attr('href').replace('/vehicles/','');

                $.get('/vehicles/'+vehicleId+'/patient/-1');
            });

            $('#saTr_'+missionId).remove();
        }
    });
})();
