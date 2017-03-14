'use strict';

var taskList = {};
var curTask = null;
var progress = 0;

function makeTask(taskName)
{
    if (taskList[taskName]) { return; }
    taskList[taskName] = {
        'items': [],
        'completion': ""
    };
}

function makeTasks(taskNames)
{
    for (var i = 0; i < taskNames.length; ++i) {
        makeTask(taskNames[i]);
    }
}

function addItem(taskName, item)
{
    if (!taskList[taskName]) { return; }
    taskList[taskName]['items'].push(item);
}

function addItems(taskName, items)
{
    for (var i = 0; i < items.length; ++i) {
        addItem(taskName, items[i]);
    }
}

function setCompletionString(taskName, str)
{
    if (!taskList[taskName]) { return; }
    taskList[taskName]['completion'] = str;
}


function setTask(taskName)
{
    if (!taskList[taskName]) { return; }
    curTask = taskName
    progress = 0;
}

function getTaskItemTotal()
{
    if (!taskList[curTask]) { return -1; }
    return taskList[curTask]['items'].length;
}

function advanceProgress()
{
    if (!taskList[curTask]) { return; }
    if (taskList[curTask]['items'].length < progress) { return; }
    ++progress;
}

function getCurTaskItem()
{
    if (!taskList[curTask]) { return null; }
    if (taskList[curTask]['items'].length < progress) { return null; }
    return taskList[curTask]['items'][progress];
}

function getCurTaskProgress()
{
    return progress + 1;
}

function getCurTaskProgressRate()
{
    if (!taskList[curTask]) { return 0.0; }
    if (taskList[curTask]['items'].length < progress) { return 0.0; }
    return (progress + 1) * 1.0 / taskList[curTask]['items'].length;
}

function genProgressString()
{
    if (!taskList[curTask]) { return ""; }
    if (taskInProgress(curTask)) {
        return getCurTaskItem() + " (" + getCurTaskProgress() + "/" + getTaskItemTotal() + ")";
    }
    else if (taskCompleted(curTask)) {
        return taskList[curTask]['completion'];
    }

    return "";
}

function taskInProgress(taskName)
{
    return taskList[curTask]['items'].length > progress;
}

function taskCompleted(taskName)
{
    return taskList[curTask]['items'].length == progress;
}
