load 'application'


# Entry point
action 'index', ->
   render
       title: "Cozy To-do"


# Helpers

# Return to client a task list like this
# { length: number of taks, rows: task list }
returnTasks = (err, tasks) ->
    if err
        console.log err
        send error: "Retrieve tasks failed.", 500
    else
        send number: tasks.length, rows: tasks

# Find task based on its id and check for errors.
findTask = (taskId, isRemoveLink, callback) ->
    Task.find taskId, (err, task) =>
        if err and not isRemoveLink
            send error: 'An error occured while getting task', 500
        else if not task? and not isRemoveLink
            send error: 'Linked task not found', 400
        else
            callback(task)

# Save task and check for errors.
saveTask = (task, callback) ->
    task.save (err) =>
        if err
            send error: "An error occured while modifying task", 500
        else
            callback()

# Update previous task link with current task ID
# If this update is due to a link removal, the next task of current task is
# set with previous task ID.
updatePreviousTask = (task, isRemoveLink, callback) ->
    if task.previousTask?
        findTask task.previousTask, isRemoveLink, (previousTask) =>
            if isRemoveLink
                previousTask.nextTask = task.nextTask
            else
                previousTask.nextTask = task.id
            saveTask previousTask, callback
    else
        callback()

# Update next task link of previous task with current task ID
# If this update is due to a link removal, the previous task of current task is
# set with next task ID.
updateNextTask = (task, isRemoveLink, callback) ->
    if task.nextTask?
        findTask task.nextTask, isRemoveLink, (nextTask) =>
            if isRemoveLink
                nextTask.previousTask = task.previousTask
            else
                nextTask.previousTask = task.id
            saveTask nextTask, callback
    else
        callback()


before 'load task', ->
    Task.find params.id, (err, task) =>
        if err
            send error: 'An error occured', 500
        else if task is null
            send error: 'Task not found', 404
        else
            @task = task
            next()
, only: ['update', 'destroy', 'show']


# Controllers

action 'todo', ->
    orderTasks = (tasks) ->

        idList = {}
        for task in tasks
            idList[task.id] = task
            firstTask = task if not task.previousTask?

        task = firstTask
        result = [firstTask]
        while task? and task.nextTask? and result.length <= tasks.length
            task = idList[task.nextTask]
            result.push(task)
        send number: result.length, rows: result

    Task.all {"where": { "done": false } }, (err, tasks) ->
        if err
            console.log err
            send error: "Retrieve tasks failed.", 500
        else if not tasks.length
            send number: 0, rows: []
        else
            orderTasks(tasks)

action 'archives', ->
    Task.all {"where": { "done": true } }, returnTasks


action 'create', ->
    newTask = new Task body
    
    createTask = (task, callback) ->
        Task.create task, (err, note) =>
            if err
                console.log err
                send error: 'Task cannot be created'
            else
                callback(task)

    createTask newTask, (task) ->
        updatePreviousTask task, false, ->
            updateNextTask task, false, ->
                send task, 201

    
# * Update task attributes
# * perform completionDate modification depending on whether is finished or not.
# * update linked list depending on previous and next task values
action 'update', ->

    # set completion date
    if body.done? and body.done
        body.completionDate = Date.now()
    else if body.done? and not body.done
        body.completionDate = null

    # Save task function
    updateTaskAttributes = =>
        @task.updateAttributes body, (err) =>
            if err
                console.log err
                send error: 'Task cannot be updated', 500
            else
                send success: 'Task updated'

    # Remove old previous link and set new previous link
    updatePreviousLink = (tmpTask, callback) =>
        if body.previousTask !=  undefined \
           and tmpTask.previousTask != body.previousTask

            # remove old previous link
            updatePreviousTask tmpTask, true, (task) =>

                # set new previous link
                tmpTask.previousTask = body.previousTask
                updatePreviousTask tmpTask, false, (task) =>
                    callback()
        else
            callback()

    # Remove old next link and set new next link
    updateNextLink = (tmpTask, callback) =>
        if body.nextTask != undefined \
           and tmpTask.nextTask != body.nextTask

            # remove old next link
            updateNextTask tmpTask, true, (task) =>
                
                # set new next link
                tmpTask.nextTask = body.nextTask
                updateNextTask tmpTask, false, (task) =>
                    callback()
        else
            callback()

    if body.done? and body.done
        updatePreviousTask @task, true, =>
            updateNextTask @task, true, =>
                body.previousTask = null
                body.nextTask = null
                updateTaskAttributes()
    else
        tmpTask = new Task
            previousTask: @task.previousTask
            nextTask: @task.nextTask
            id: @task.id
        updatePreviousLink tmpTask, =>
            tmpTask = new Task
                previousTask: @task.previousTask
                nextTask: @task.nextTask
                id: @task.id
            updateNextLink tmpTask, =>
                updateTaskAttributes()


action 'destroy', ->
    
    destroyTask = (task, callback) ->
        task.destroy (err) ->
            if err
                console.log err
                send error: 'Cannot destroy task', 500
            else
                callback(task)

    destroyTask @task, (task) ->
        updatePreviousTask task, true, ->
            updateNextTask task, true, ->
                send success: 'Task succesfuly deleted'


action 'show', ->
    returnTasks null, [@task]

