'use strict';

var taskList = {};
var curTask = null;
var progress = 0;

function makeTask(taskName)
{
    if (taskList[taskName]) { return; }
    taskList[taskName] = [];
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
    taskList[taskName].push(item);
}

function addItems(taskName, items)
{
    for (var i = 0; i < items.length; ++i) {
        addItem(taskName, items[i]);
    }
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
    return taskList[curTask].length;
}

function advanceProgress()
{
    if (!taskList[curTask]) { return; }
    if (taskList[curTask].length < progress) { return; }
    ++progress;
}

function getCurTaskItem()
{
    if (!taskList[curTask]) { return null; }
    if (taskList[curTask].length < progress) { return null; }
    return taskList[curTask][progress];
}

function getCurTaskProgress()
{
    return progress + 1;
}
