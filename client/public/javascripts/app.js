(function(/*! Brunch !*/) {
  'use strict';

  var globals = typeof window !== 'undefined' ? window : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};

  var has = function(object, name) {
    return hasOwnProperty.call(object, name);
  };

  var expand = function(root, name) {
    var results = [], parts, part;
    if (/^\.\.?(\/|$)/.test(name)) {
      parts = [root, name].join('/').split('/');
    } else {
      parts = name.split('/');
    }
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function(name) {
      var dir = dirname(path);
      var absolute = expand(dir, name);
      return require(absolute);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    definition(module.exports, localRequire(name), module);
    var exports = cache[name] = module.exports;
    return exports;
  };

  var require = function(name) {
    var path = expand(name, '.');

    if (has(cache, path)) return cache[path];
    if (has(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has(cache, dirIndex)) return cache[dirIndex];
    if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '"');
  };

  var define = function(bundle) {
    for (var key in bundle) {
      if (has(bundle, key)) {
        modules[key] = bundle[key];
      }
    }
  }

  globals.require = require;
  globals.require.define = define;
  globals.require.brunch = true;
})();

window.require.define({"collections/tasks": function(exports, require, module) {
  (function() {
    var Task,
      __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    Task = require("../models/task").Task;

    exports.TaskCollection = (function(_super) {

      __extends(TaskCollection, _super);

      TaskCollection.prototype.model = Task;

      TaskCollection.prototype.url = 'tasks/';

      function TaskCollection(view, listId) {
        this.view = view;
        this.listId = listId;
        this.down = __bind(this.down, this);
        this.up = __bind(this.up, this);
        this.prependTask = __bind(this.prependTask, this);
        this.addTasks = __bind(this.addTasks, this);
        TaskCollection.__super__.constructor.call(this);
        this.url = "todolists/" + this.listId + "/tasks";
        this.bind("add", this.prependTask);
        this.bind("reset", this.addTasks);
      }

      TaskCollection.prototype.parse = function(response) {
        return response.rows;
      };

      TaskCollection.prototype.addTasks = function(tasks) {
        var _this = this;
        return tasks.forEach(function(task) {
          task.collection = _this;
          return _this.view.addTaskLine(task);
        });
      };

      TaskCollection.prototype.prependTask = function(task) {
        var nextTask;
        task.collection = this;
        nextTask = this.at(0);
        if (nextTask != null) {
          nextTask.set("previousTask", task.id);
          task.set("nextTask", nextTask.id);
        }
        return this.view.addTaskLineAsFirstRow(task);
      };

      TaskCollection.prototype.insertTask = function(previousTask, task, callbacks) {
        var index,
          _this = this;
        index = this.toArray().indexOf(previousTask);
        task.set("nextTask", previousTask.nextTask);
        task.set("previousTask", previousTask.id);
        task.collection = this;
        return task.save(task.attributes, {
          success: function() {
            previousTask.set("nextTask", task.id);
            task.url = "" + _this.url + "/" + task.id + "/";
            _this.add(task, {
              at: index,
              silent: true
            });
            _this.view.insertTask(previousTask.view, task);
            return callbacks != null ? callbacks.success(task) : void 0;
          },
          error: function() {
            return callbacks != null ? callbacks.error : void 0;
          }
        });
      };

      TaskCollection.prototype.getPreviousTask = function(task) {
        return this.get(task.previousTask);
      };

      TaskCollection.prototype.getNextTask = function(task) {
        return this.get(task.nextTask);
      };

      TaskCollection.prototype.getPreviousTodoTask = function(task) {
        task = this.getPreviousTask(task);
        while ((task != null) && task.done) {
          task = this.getPreviousTask(task);
        }
        return task;
      };

      TaskCollection.prototype.getNextTodoTask = function(task) {
        task = this.getNextTask(task);
        while ((task != null) && task.done) {
          task = this.getNextTask(task);
        }
        return task;
      };

      TaskCollection.prototype.up = function(task) {
        var index, nextTask, oldPreviousTask, previousTask;
        index = this.toArray().indexOf(task);
        if (index === 0) return false;
        if (index > 0) oldPreviousTask = this.at(index - 1);
        if (index > 1) previousTask = this.at(index - 2);
        nextTask = this.at(index + 1);
        if (nextTask != null) {
          nextTask.set("previousTask", oldPreviousTask.id);
          oldPreviousTask.set("nextTask", nextTask.id);
        } else {
          oldPreviousTask.set("nextTask", null);
        }
        if (previousTask != null) {
          previousTask.set("nextTask", task.id);
          task.set("previousTask", previousTask.id);
        } else {
          task.set("previousTask", null);
        }
        task.set("nextTask", oldPreviousTask.id);
        this.remove(task);
        this.add(task, {
          at: index - 1,
          silent: true
        });
        task.view.up(oldPreviousTask.id);
        return true;
      };

      TaskCollection.prototype.down = function(task) {
        var index, nextTask, oldNextTask, previousTask, tasksLength;
        index = this.toArray().indexOf(task);
        tasksLength = this.size();
        if (index === tasksLength - 1) return false;
        if (index < tasksLength - 1) oldNextTask = this.at(index + 1);
        if (index < tasksLength - 1) nextTask = this.at(index + 2);
        previousTask = this.at(index - 1);
        if (previousTask != null) {
          previousTask.set("nextTask", oldNextTask.id);
          oldNextTask.set("previousTask", previousTask.id);
        } else {
          oldNextTask.set("previousTask", null);
        }
        if (nextTask != null) {
          nextTask.set("previousTask", task.id);
          task.set("nextTask", nextTask.id);
        } else {
          task.set("nextTask", null);
        }
        task.set("previousTask", oldNextTask.id);
        this.remove(task);
        this.add(task, {
          at: index + 1,
          silent: true
        });
        task.view.down(oldNextTask.id);
        return true;
      };

      TaskCollection.prototype.removeTask = function(task, callbacks) {
        var nextTask, previousTask;
        previousTask = this.getPreviousTask(task);
        nextTask = this.getNextTask(task);
        if (nextTask != null) {
          nextTask.set("previousTask", (previousTask != null ? previousTask.id : void 0) | null);
        }
        if (previousTask != null) {
          previousTask.set("nextTask", (nextTask != null ? nextTask.id : void 0) | null);
        }
        return task.destroy({
          success: function() {
            task.view.remove();
            return callbacks != null ? callbacks.success() : void 0;
          },
          error: callbacks.error
        });
      };

      return TaskCollection;

    })(Backbone.Collection);

  }).call(this);
  
}});

window.require.define({"helpers": function(exports, require, module) {
  (function() {

    exports.BrunchApplication = (function() {

      function BrunchApplication() {
        var _this = this;
        $(function() {
          _this.initialize(_this);
          return Backbone.history.start();
        });
      }

      BrunchApplication.prototype.initialize = function() {
        return null;
      };

      return BrunchApplication;

    })();

    exports.selectAll = function(node) {
      var range, sel;
      if (node.length > 0) {
        range = rangy.createRange();
        range.selectNodeContents(node[0].childNodes[0]);
        sel = rangy.getSelection();
        sel.setSingleRange(range);
        return true;
      } else {
        return false;
      }
    };

    exports.getCursorPosition = function(node) {
      var range, sel;
      if (node.length > 0) {
        range = rangy.createRange();
        range.selectNodeContents(node[0].childNodes[0]);
        sel = rangy.getSelection();
        range = sel.getRangeAt(0);
        return range.endOffset;
      } else {
        return 0;
      }
    };

    exports.setCursorPosition = function(node, cursorPosition) {
      var range, sel;
      if (node.length > 0) {
        range = rangy.createRange();
        range.collapseToPoint(node[0].childNodes[0], cursorPosition);
        sel = rangy.getSelection();
        sel.setSingleRange(range);
        return true;
      } else {
        return false;
      }
    };

    exports.slugify = function(string) {
      var _slugify_hyphenate_re, _slugify_strip_re;
      _slugify_strip_re = /[^\w\s-]/g;
      _slugify_hyphenate_re = /[-\s]+/g;
      string = string.replace(_slugify_strip_re, '').trim().toLowerCase();
      string = string.replace(_slugify_hyphenate_re, '-');
      return string;
    };

    exports.getPathRegExp = function(path) {
      var slashReg;
      slashReg = new RegExp("/", "g");
      return "^" + (path.replace(slashReg, "\/"));
    };

  }).call(this);
  
}});

window.require.define({"initialize": function(exports, require, module) {
  (function() {
    var BrunchApplication, HomeView, MainRouter,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    BrunchApplication = require('helpers').BrunchApplication;

    MainRouter = require('routers/main_router').MainRouter;

    HomeView = require('views/home_view').HomeView;

    exports.Application = (function(_super) {

      __extends(Application, _super);

      function Application() {
        Application.__super__.constructor.apply(this, arguments);
      }

      Application.prototype.initialize = function() {
        this.router = new MainRouter;
        return this.homeView = new HomeView;
      };

      return Application;

    })(BrunchApplication);

    window.app = new exports.Application;

  }).call(this);
  
}});

window.require.define({"models/models": function(exports, require, module) {
  (function() {
    var __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    exports.BaseModel = (function(_super) {

      __extends(BaseModel, _super);

      function BaseModel() {
        BaseModel.__super__.constructor.apply(this, arguments);
      }

      BaseModel.prototype.isNew = function() {
        return !(this.id != null);
      };

      return BaseModel;

    })(Backbone.Model);

  }).call(this);
  
}});

window.require.define({"models/task": function(exports, require, module) {
  (function() {
    var BaseModel,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    BaseModel = require("./models").BaseModel;

    exports.Task = (function(_super) {

      __extends(Task, _super);

      Task.prototype.url = 'tasks/';

      function Task(task) {
        var property;
        Task.__super__.constructor.call(this, task);
        for (property in task) {
          this[property] = task[property];
        }
        if (this.id) {
          this.url = "/todolists/" + task.list + "/tasks/" + this.id + "/";
        } else {
          this.url = "/todolists/" + task.list + "/tasks/";
        }
        if (!(task.description != null) || task.description.length === 0 || task.description === " " || task.description === "   " || task.description === "  ") {
          this["description"] = "empty task";
        }
      }

      Task.prototype.setDone = function() {
        this.done = true;
        this.set("previousTask", null);
        this.set("nextTask", null);
        this.cleanLinks();
        return this.view.done();
      };

      Task.prototype.setUndone = function() {
        this.done = false;
        this.setLink();
        return this.view.undone();
      };

      Task.prototype.setLink = function() {
        var firstTask, nextTask, previousTask;
        if (this.collection.view.isArchive()) {
          this.view.remove();
          this.collection.view.moveToTaskList(this);
          firstTask = this.collection.at(0);
          this.set("nextTask", firstTask.id);
          return firstTask.set("firstTask", this.id);
        } else {
          previousTask = this.collection.getPreviousTodoTask(this);
          nextTask = this.collection.getNextTodoTask(this);
          if (previousTask != null) {
            this.set("previousTask", previousTask.id);
            previousTask.set("nextTask", this.id);
          } else {
            this.set("previousTask", null);
          }
          if (nextTask != null) {
            this.set("nextTask", nextTask.id);
            return nextTask.set("previousTask", this.id);
          } else {
            return this.set("nextTask", null);
          }
        }
      };

      Task.prototype.cleanLinks = function() {
        var nextTask, previousTask;
        previousTask = this.collection.getPreviousTask(this);
        nextTask = this.collection.getNextTask(this);
        if ((nextTask != null) && (previousTask != null)) {
          previousTask.set("nextTask", nextTask.id);
          return nextTask.set("previousTask", previousTask.id);
        } else if (previousTask != null) {
          return previousTask.set("nextTask", null);
        } else if (nextTask != null) {
          return nextTask.set("previousTask", null);
        }
      };

      return Task;

    })(BaseModel);

  }).call(this);
  
}});

window.require.define({"models/todolist": function(exports, require, module) {
  (function() {
    var BaseModel, request,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    BaseModel = require("models/models").BaseModel;

    request = function(type, url, data, callback) {
      return $.ajax({
        type: type,
        url: url,
        data: data,
        success: callback,
        error: function(data) {
          if (data && data.msg) {
            return alert(data.msg);
          } else {
            return alert("Server error occured.");
          }
        }
      });
    };

    exports.TodoList = (function(_super) {

      __extends(TodoList, _super);

      TodoList.prototype.url = 'todolists/';

      function TodoList(todolist) {
        var property;
        TodoList.__super__.constructor.call(this);
        for (property in todolist) {
          this[property] = todolist[property];
        }
      }

      TodoList.prototype.saveContent = function(content) {
        this.content = content;
        this.url = "todolists/" + this.id;
        return this.save({
          content: this.content
        });
      };

      TodoList.createTodoList = function(data, callback) {
        return request("POST", "todolists", data, callback);
      };

      TodoList.updateTodoList = function(id, data, callback) {
        return request("PUT", "todolists/" + id, data, callback);
      };

      TodoList.moveTodoList = function(data, callback) {
        return request("POST", "tree/path/move", data, callback);
      };

      TodoList.getTodoList = function(id, callback) {
        var _this = this;
        return $.get("todolists/" + id, function(data) {
          var todolist;
          todolist = new TodoList(data);
          return callback(todolist);
        });
      };

      return TodoList;

    })(BaseModel);

  }).call(this);
  
}});

window.require.define({"routers/main_router": function(exports, require, module) {
  (function() {
    var __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    exports.MainRouter = (function(_super) {

      __extends(MainRouter, _super);

      function MainRouter() {
        MainRouter.__super__.constructor.apply(this, arguments);
      }

      MainRouter.prototype.routes = {
        '': 'home'
      };

      MainRouter.prototype.initialize = function() {
        return this.route(/^todolist\/(.*?)$/, 'list');
      };

      MainRouter.prototype.home = function() {
        $('body').html(app.homeView.render().el);
        app.homeView.setLayout();
        return app.homeView.loadData();
      };

      MainRouter.prototype.list = function(path) {
        var selectList;
        selectList = function() {
          return app.homeView.selectList(path);
        };
        if ($("#tree-create").length > 0) {
          return selectList();
        } else {
          return this.home(function() {
            return setTimeout((function() {
              return selectList();
            }), 100);
          });
        }
      };

      return MainRouter;

    })(Backbone.Router);

  }).call(this);
  
}});

window.require.define({"views/home_view": function(exports, require, module) {
  (function() {
    var TodoList, TodoListWidget, Tree, helpers,
      __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    Tree = require("./widgets/tree").Tree;

    TodoList = require("../models/todolist").TodoList;

    TodoListWidget = require("./todolist_view").TodoListWidget;

    helpers = require("../helpers");

    exports.HomeView = (function(_super) {

      __extends(HomeView, _super);

      HomeView.prototype.id = 'home-view';

      /*
          # Initializers
      */

      HomeView.prototype.isEditMode = false;

      HomeView.prototype.initialize = function() {};

      function HomeView() {
        this.onTodolistDropped = __bind(this.onTodolistDropped, this);
        this.onTreeLoaded = __bind(this.onTreeLoaded, this);
        this.selectFolder = __bind(this.selectFolder, this);
        this.deleteFolder = __bind(this.deleteFolder, this);
        this.renameFolder = __bind(this.renameFolder, this);
        this.createFolder = __bind(this.createFolder, this);      HomeView.__super__.constructor.call(this);
      }

      HomeView.prototype.render = function() {
        $(this.el).html(require('./templates/home'));
        this.todolist = $("#todo-list");
        return this;
      };

      HomeView.prototype.setLayout = function() {
        return $(this.el).layout({
          size: "350",
          minSize: "350",
          resizable: true
        });
      };

      HomeView.prototype.loadData = function() {
        var _this = this;
        return $.get("tree/", function(data) {
          return _this.tree = new Tree(_this.$("#nav"), $("#tree"), data, {
            onCreate: _this.createFolder,
            onRename: _this.renameFolder,
            onRemove: _this.deleteFolder,
            onSelect: _this.selectFolder,
            onLoaded: _this.onTreeLoaded,
            onDrop: _this.onTodolistDropped
          });
        });
      };

      /*
          # Listeners
      */

      HomeView.prototype.createFolder = function(path, newName, data) {
        var _this = this;
        path = path + "/" + helpers.slugify(newName);
        return TodoList.createTodoList({
          path: path,
          title: newName
        }, function(todolist) {
          data.rslt.obj.data("id", todolist.id);
          data.inst.deselect_all();
          return data.inst.select_node(data.rslt.obj);
        });
      };

      HomeView.prototype.renameFolder = function(path, newName, data) {
        var _this = this;
        if (newName != null) {
          return TodoList.updateTodoList(data.rslt.obj.data("id"), {
            title: newName
          }, function() {
            data.inst.deselect_all();
            return data.inst.select_node(data.rslt.obj);
          });
        }
      };

      HomeView.prototype.deleteFolder = function(path) {
        $("#todo-list").html(null);
        return this.currentTodolist.destroy();
      };

      HomeView.prototype.selectFolder = function(path, id) {
        var _this = this;
        if (path.indexOf("/")) path = "/" + path;
        app.router.navigate("todolist" + path, {
          trigger: false
        });
        if (id != null) {
          return TodoList.getTodoList(id, function(todolist) {
            _this.renderTodolist(todolist);
            return _this.todolist.show();
          });
        } else {
          return $("#todo-list").html(null);
        }
      };

      HomeView.prototype.selectList = function(path) {
        return this.tree.selectNode(path);
      };

      HomeView.prototype.renderTodolist = function(todolist) {
        var todolistWidget;
        todolist.url = "todolists/" + todolist.id;
        this.currentTodolist = todolist;
        todolistWidget = new TodoListWidget(this.currentTodolist);
        todolistWidget.render();
        return todolistWidget.loadData();
      };

      HomeView.prototype.onTreeLoaded = function() {
        if (this.treeCreationCallback != null) return this.treeCreationCallback();
      };

      HomeView.prototype.onTodolistDropped = function(newPath, oldPath, todolistTitle, data) {
        var _this = this;
        newPath = newPath + "/" + helpers.slugify(todolistTitle);
        return Todolist.updateTodolist(data.rslt.o.data("id"), {
          path: newPath
        }, function() {
          data.inst.deselect_all();
          return data.inst.select_node(data.rslt.o);
        });
      };

      return HomeView;

    })(Backbone.View);

  }).call(this);
  
}});

window.require.define({"views/task_view": function(exports, require, module) {
  (function() {
    var Task, helpers, template,
      __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    template = require("./templates/task");

    Task = require("../models/task").Task;

    helpers = require("../helpers");

    exports.TaskLine = (function(_super) {

      __extends(TaskLine, _super);

      TaskLine.prototype.className = "task clearfix";

      TaskLine.prototype.tagName = "div";

      TaskLine.prototype.events = {
        "click .todo-button": "onTodoButtonClicked",
        "click .del-task-button": "onDelButtonClicked",
        "click .up-task-button": "onUpButtonClicked",
        "click .down-task-button": "onDownButtonClicked"
      };

      /* 
      # Initializers
      */

      function TaskLine(model, list) {
        this.model = model;
        this.list = list;
        this.onDescriptionChanged = __bind(this.onDescriptionChanged, this);
        this.onDownButtonClicked = __bind(this.onDownButtonClicked, this);
        this.onUpButtonClicked = __bind(this.onUpButtonClicked, this);
        this.onDelButtonClicked = __bind(this.onDelButtonClicked, this);
        this.onTodoButtonClicked = __bind(this.onTodoButtonClicked, this);
        TaskLine.__super__.constructor.call(this);
        this.saving = false;
        this.id = this.model._id;
        this.model.view = this;
        this.firstDel = false;
        this.isDeleting = false;
        this.list;
      }

      TaskLine.prototype.render = function() {
        template = require('./templates/task');
        $(this.el).html(template({
          "model": this.model
        }));
        this.el.id = this.model.id;
        if (this.model.done) this.done();
        this.descriptionField = this.$("span.description");
        this.buttons = this.$(".task-buttons");
        this.setListeners();
        this.$(".task-buttons").hide();
        this.descriptionField.data('before', this.descriptionField.html());
        return this.el;
      };

      TaskLine.prototype.setListeners = function() {
        var _this = this;
        this.descriptionField.keypress(function(event) {
          var keyCode;
          keyCode = event.which | event.keyCode;
          return keyCode !== 13 && keyCode !== 38 && keyCode !== 40;
        });
        this.descriptionField.keyup(function(event) {
          var keyCode;
          keyCode = event.which | event.keyCode;
          if (event.ctrlKey) {
            if (keyCode === 38) _this.onCtrlUpKeyup();
            if (keyCode === 40) _this.onCtrlDownKeyup();
            if (keyCode === 32) return _this.onTodoButtonClicked();
          } else {
            if (keyCode === 38) _this.onUpKeyup();
            if (keyCode === 40) _this.onDownKeyup();
            if (keyCode === 13) _this.onEnterKeyup();
            if (keyCode === 8) return _this.onBackspaceKeyup();
          }
        });
        this.descriptionField.live('blur paste', function(event) {
          var el;
          el = $(_this.descriptionField);
          if (el.data('before') !== el.html() && !_this.isDeleting) {
            el.data('before', el.html());
            el.trigger('change', event.which | event.keyCode);
          }
          return el;
        });
        return this.descriptionField.bind("change", this.onDescriptionChanged);
      };

      /*
          # Listeners
      */

      TaskLine.prototype.onTodoButtonClicked = function(event) {
        if (this.model.done) {
          this.model.setUndone();
        } else {
          this.model.setDone();
        }
        return this.model.save({
          done: this.model.done
        }, {
          success: function() {},
          error: function() {
            return alert("An error occured, modifications were not saved.");
          }
        });
      };

      TaskLine.prototype.onDelButtonClicked = function(event) {
        return this.delTask();
      };

      TaskLine.prototype.onUpButtonClicked = function(event) {
        if (!this.model.done && this.model.collection.up(this.model)) {
          this.focusDescription();
          return this.model.save({
            success: function() {},
            error: function() {
              return alert("An error occured, modifications were not saved.");
            }
          });
        }
      };

      TaskLine.prototype.onDownButtonClicked = function(event) {
        if (!this.model.done && this.model.collection.down(this.model)) {
          return this.model.save({
            success: function() {},
            error: function() {
              return alert("An error occured, modifications were not saved.");
            }
          });
        }
      };

      TaskLine.prototype.onDescriptionChanged = function(event, keyCode) {
        if (!(keyCode === 8 || this.descriptionField.html().length === 0)) {
          this.saving = false;
          this.model.description = this.descriptionField.html();
          return this.model.save({
            description: this.model.description
          }, {
            success: function() {},
            error: function() {
              return alert("An error occured, modifications were not saved.");
            }
          });
        }
      };

      TaskLine.prototype.onUpKeyup = function() {
        return this.list.moveUpFocus(this);
      };

      TaskLine.prototype.onDownKeyup = function() {
        return this.list.moveDownFocus(this);
      };

      TaskLine.prototype.onCtrlUpKeyup = function() {
        this.onUpButtonClicked();
        return this.focusDescription();
      };

      TaskLine.prototype.onCtrlDownKeyup = function() {
        this.onDownButtonClicked();
        return this.focusDescription();
      };

      TaskLine.prototype.onEnterKeyup = function() {
        return this.model.collection.insertTask(this.model, new Task({
          description: "new task"
        }), {
          success: function(task) {
            return helpers.selectAll(task.view.descriptionField);
          },
          error: function() {
            return alert("Saving failed, an error occured.");
          }
        });
      };

      TaskLine.prototype.onBackspaceKeyup = function() {
        var description;
        description = this.descriptionField.html();
        if ((description.length === 0 || description === " ") && this.firstDel) {
          this.isDeleting = true;
          if (this.model.previousTask != null) {
            this.list.moveUpFocus(this, {
              maxPosition: true
            });
          } else if (this.model.nextTask != null) {
            this.list.moveDownFocus(this, {
              maxPosition: true
            });
          }
          return this.delTask();
        } else if ((description.length === 0 || description === " ") && !this.firstDel) {
          return this.firstDel = true;
        } else {
          return this.firstDel = false;
        }
      };

      /*
          # Functions
      */

      TaskLine.prototype.done = function() {
        this.$(".todo-button").html("done");
        this.$(".todo-button").addClass("disabled");
        this.$(".todo-button").removeClass("btn-info");
        return $(this.el).addClass("done");
      };

      TaskLine.prototype.undone = function() {
        this.$(".todo-button").html("todo");
        this.$(".todo-button").removeClass("disabled");
        this.$(".todo-button").addClass("btn-info");
        return $(this.el).removeClass("done");
      };

      TaskLine.prototype.up = function(previousLineId) {
        var cursorPosition;
        cursorPosition = helpers.getCursorPosition(this.descriptionField);
        $(this.el).insertBefore($("#" + previousLineId));
        return helpers.setCursorPosition(this.descriptionField, cursorPosition);
      };

      TaskLine.prototype.down = function(nextLineId) {
        var cursorPosition;
        cursorPosition = helpers.getCursorPosition(this.descriptionField);
        $(this.el).insertAfter($("#" + nextLineId));
        return helpers.setCursorPosition(this.descriptionField, cursorPosition);
      };

      TaskLine.prototype.remove = function() {
        this.unbind();
        return $(this.el).remove();
      };

      TaskLine.prototype.focusDescription = function() {
        return this.descriptionField.focus();
      };

      TaskLine.prototype.delTask = function(callback) {
        return this.model.collection.removeTask(this.model, {
          success: function() {
            if (callback) return callback();
          },
          error: function() {
            return alert("An error occured, deletion was not saved.");
          }
        });
      };

      TaskLine.prototype.showButtons = function() {
        return this.buttons.show();
      };

      TaskLine.prototype.hideButtons = function() {
        return this.buttons.hide();
      };

      return TaskLine;

    })(Backbone.View);

  }).call(this);
  
}});

window.require.define({"views/tasks_view": function(exports, require, module) {
  (function() {
    var TaskCollection, TaskLine, helpers,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    TaskCollection = require("../collections/tasks").TaskCollection;

    TaskLine = require("../views/task_view").TaskLine;

    helpers = require("../helpers");

    exports.TaskList = (function(_super) {

      __extends(TaskList, _super);

      TaskList.prototype.className = "task clearfix";

      TaskList.prototype.tagName = "div";

      function TaskList(todoListView, el) {
        this.todoListView = todoListView;
        this.el = el;
        TaskList.__super__.constructor.call(this);
        this.tasks = new TaskCollection(this, this.todoListView.model.id);
      }

      TaskList.prototype.addTaskLine = function(task) {
        var taskLine;
        taskLine = new TaskLine(task, this);
        return $(this.el).append(taskLine.render());
      };

      TaskList.prototype.addTaskLineAsFirstRow = function(task) {
        var taskLine;
        taskLine = new TaskLine(task, this);
        return $(this.el).prepend(taskLine.render());
      };

      TaskList.prototype.isArchive = function() {
        return $(this.el).attr("id") === "archive-list";
      };

      TaskList.prototype.moveToTaskList = function(task) {
        return this.todoListView.moveToTaskList(task);
      };

      TaskList.prototype.moveUpFocus = function(taskLine, options) {
        var nextDescription, selector;
        selector = "#" + taskLine.model.id;
        nextDescription = $(selector).prev().find(".description");
        return this.moveFocus(taskLine.descriptionField, nextDescription, options);
      };

      TaskList.prototype.moveDownFocus = function(taskLine, options) {
        var nextDescription, selector;
        selector = "#" + taskLine.model.id;
        nextDescription = $(selector).next().find(".description");
        return this.moveFocus(taskLine.descriptionField, nextDescription, options);
      };

      TaskList.prototype.moveFocus = function(previousNode, nextNode, options) {
        var cursorPosition;
        cursorPosition = helpers.getCursorPosition(previousNode);
        nextNode.focus();
        if (((options != null ? options.maxPosition : void 0) != null) && options.maxPosition) {
          return helpers.setCursorPosition(nextNode, nextNode.text().length);
        } else {
          return helpers.setCursorPosition(nextNode, cursorPosition);
        }
      };

      TaskList.prototype.insertTask = function(previousTaskLine, task) {
        var taskLine, taskLineEl;
        taskLine = new TaskLine(task);
        taskLine.list = this;
        taskLineEl = $(taskLine.render());
        taskLineEl.insertAfter($(previousTaskLine.el));
        taskLine.focusDescription();
        if (this.todoListView.isEditMode) taskLine.showButtons();
        return taskLine;
      };

      return TaskList;

    })(Backbone.View);

  }).call(this);
  
}});

window.require.define({"views/templates/home": function(exports, require, module) {
  module.exports = function anonymous(locals, attrs, escape, rethrow) {
  var attrs = jade.attrs, escape = jade.escape, rethrow = jade.rethrow;
  var buf = [];
  with (locals || {}) {
  var interp;
  buf.push('<div');
  buf.push(attrs({ 'id':('nav'), "class": ('ui-layout-west') }));
  buf.push('><div');
  buf.push(attrs({ 'id':('tree') }));
  buf.push('></div></div><div');
  buf.push(attrs({ 'id':('content'), "class": ('ui-layout-center') }));
  buf.push('><div');
  buf.push(attrs({ 'id':('todo-list') }));
  buf.push('></div></div>');
  }
  return buf.join("");
  };
}});

window.require.define({"views/templates/task": function(exports, require, module) {
  module.exports = function anonymous(locals, attrs, escape, rethrow) {
  var attrs = jade.attrs, escape = jade.escape, rethrow = jade.rethrow;
  var buf = [];
  with (locals || {}) {
  var interp;
  buf.push('<button');
  buf.push(attrs({ "class": ('btn') + ' ' + ('btn-info') + ' ' + ('todo-button') }));
  buf.push('>todo</button><span');
  buf.push(attrs({ 'contenteditable':("true"), "class": ('description') }));
  buf.push('>' + escape((interp = model.description) == null ? '' : interp) + ' </span><div');
  buf.push(attrs({ "class": ('task-buttons') }));
  buf.push('><button');
  buf.push(attrs({ "class": ('up-task-button') + ' ' + ('btn') }));
  buf.push('>up</button><button');
  buf.push(attrs({ "class": ('down-task-button') + ' ' + ('btn') }));
  buf.push('>down</button><button');
  buf.push(attrs({ "class": ('del-task-button') + ' ' + ('btn') }));
  buf.push('>X</button></div>');
  }
  return buf.join("");
  };
}});

window.require.define({"views/templates/todolist": function(exports, require, module) {
  module.exports = function anonymous(locals, attrs, escape, rethrow) {
  var attrs = jade.attrs, escape = jade.escape, rethrow = jade.rethrow;
  var buf = [];
  with (locals || {}) {
  var interp;
  buf.push('<header');
  buf.push(attrs({ "class": ('todo-list-title') + ' ' + ('clearfix') }));
  buf.push('><button');
  buf.push(attrs({ 'id':("new-task-button"), "class": ("btn btn-large btn-success") }));
  buf.push('>new task\n</button><button');
  buf.push(attrs({ 'id':("edit-button"), "class": ("btn btn-large") }));
  buf.push('>show buttons\n</button><p><span');
  buf.push(attrs({ "class": ('breadcrump') }));
  buf.push('></span></p><p><span');
  buf.push(attrs({ "class": ('description') }));
  buf.push('></span></p></header><div');
  buf.push(attrs({ 'id':('task-list') }));
  buf.push('></div><h2>archives</h2><div');
  buf.push(attrs({ 'id':('archive-list') }));
  buf.push('></div>');
  }
  return buf.join("");
  };
}});

window.require.define({"views/templates/tree_buttons": function(exports, require, module) {
  module.exports = function anonymous(locals, attrs, escape, rethrow) {
  var attrs = jade.attrs, escape = jade.escape, rethrow = jade.rethrow;
  var buf = [];
  with (locals || {}) {
  var interp;
  buf.push('<div');
  buf.push(attrs({ 'id':('tree-buttons') }));
  buf.push('><div');
  buf.push(attrs({ 'id':('tree-create'), "class": ('button') }));
  buf.push('><i');
  buf.push(attrs({ "class": ('icon-plus') }));
  buf.push('></i><span>new</span></div><div');
  buf.push(attrs({ 'id':('tree-remove'), "class": ('button') }));
  buf.push('><i');
  buf.push(attrs({ "class": ('icon-remove') }));
  buf.push('></i><span>delete</span></div><div');
  buf.push(attrs({ 'id':('tree-rename'), "class": ('button') }));
  buf.push('><i');
  buf.push(attrs({ "class": ('icon-pencil') }));
  buf.push('></i><span>rename</span></div><div');
  buf.push(attrs({ 'id':('tree-search'), "class": ('button') }));
  buf.push('><i');
  buf.push(attrs({ "class": ('icon-search') }));
  buf.push('></i></div><div');
  buf.push(attrs({ "class": ('spacer') }));
  buf.push('></div><input');
  buf.push(attrs({ 'id':('tree-search-field'), 'type':("text") }));
  buf.push('/></div>');
  }
  return buf.join("");
  };
}});

window.require.define({"views/todolist_view": function(exports, require, module) {
  (function() {
    var Task, TaskCollection, TaskList,
      __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    TaskCollection = require("../collections/tasks").TaskCollection;

    Task = require("../models/task").Task;

    TaskList = require("./tasks_view").TaskList;

    exports.TodoListWidget = (function(_super) {

      __extends(TodoListWidget, _super);

      TodoListWidget.prototype.id = "todo-list";

      TodoListWidget.prototype.tagName = "div";

      TodoListWidget.prototype.el = "#todo-list";

      TodoListWidget.prototype.events = {
        "click #new-task-button": "onAddClicked",
        "click #edit-button": "onEditClicked"
      };

      /* Constructor
      */

      function TodoListWidget(model) {
        this.model = model;
        this.onEditClicked = __bind(this.onEditClicked, this);
        TodoListWidget.__super__.constructor.call(this);
        this.id = this.model.slug;
        this.model.view = this;
      }

      TodoListWidget.prototype.remove = function() {
        return $(this.el).remove();
      };

      /* configuration
      */

      TodoListWidget.prototype.render = function() {
        var breadcrump, path;
        $(this.el).html(require('./templates/todolist'));
        this.$(".todo-list-title span.description").html(this.model.title);
        path = this.model.humanPath.split(",").join(" / ");
        this.$(".todo-list-title span.breadcrump").html(path);
        this.taskList = new TaskList(this, this.$("#task-list"));
        this.archiveList = new TaskList(this, this.$("#archive-list"));
        this.tasks = this.taskList.tasks;
        this.archiveTasks = this.archiveList.tasks;
        this.newButton = $("#new-task-button");
        this.showButtonsButton = $("#edit-button");
        this.newButton.hide();
        breadcrump = this.model.humanPath.split(",");
        breadcrump.pop();
        $("#todo-list-full-breadcrump").html(breadcrump.join(" / "));
        $("#todo-list-full-title").html(this.model.title);
        return this.el;
      };

      TodoListWidget.prototype.onAddClicked = function(event) {
        var task,
          _this = this;
        task = new Task({
          done: false,
          description: "new task",
          list: this.model.id
        });
        return task.save(null, {
          success: function(data) {
            data.url = "tasks/" + data.id + "/";
            _this.tasks.add(data);
            $(".task:first .description").focus();
            helpers.selectAll($(".task:first .description"));
            if (!_this.isEditMode) {
              return $(".task:first .task-buttons").hide();
            } else {
              return $(".task:first .task-buttons").show();
            }
          },
          error: function() {
            return alert("An error occured while saving data");
          }
        });
      };

      TodoListWidget.prototype.onEditClicked = function(event) {
        if (!this.isEditMode) {
          this.$(".task:not(.done) .task-buttons").show();
          this.newButton.show();
          this.isEditMode = true;
          return this.showButtonsButton.html("hide buttons");
        } else {
          this.$(".task-buttons").hide();
          this.newButton.hide();
          this.isEditMode = false;
          return this.showButtonsButton.html("show buttons");
        }
      };

      /*
          # Functions
      */

      TodoListWidget.prototype.loadData = function() {
        var _this = this;
        this.archiveTasks.url += "/archives";
        this.archiveTasks.fetch();
        return this.tasks.fetch({
          success: function() {
            if ($(".task:not(.done)").length > 0) {
              return $(".task:first .description").focus();
            } else {
              return _this.onAddClicked();
            }
          }
        });
      };

      TodoListWidget.prototype.moveToTaskList = function(task) {
        return this.tasks.prependTask(task);
      };

      return TodoListWidget;

    })(Backbone.View);

  }).call(this);
  
}});

window.require.define({"views/widgets/tree": function(exports, require, module) {
  (function() {
    var slugify,
      __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

    slugify = require("../../helpers").slugify;

    exports.Tree = (function() {

      function Tree(navEl, treeEl, data, callbacks) {
        var tree;
        this.treeEl = treeEl;
        this._onSearchChanged = __bind(this._onSearchChanged, this);
        this._onSearchClicked = __bind(this._onSearchClicked, this);
        this._convertData = __bind(this._convertData, this);
        this._getStringPath = __bind(this._getStringPath, this);
        this.setToolbar(navEl);
        tree = this._convertData(data);
        this.widget = this.treeEl.jstree({
          plugins: ["themes", "json_data", "ui", "crrm", "unique", "sort", "cookies", "types", "hotkeys", "dnd", "search"],
          json_data: tree,
          types: {
            "default": {
              valid_children: "default"
            },
            "root": {
              valid_children: null,
              delete_node: false,
              rename_node: false,
              move_node: false,
              start_drag: false
            }
          },
          ui: {
            select_limit: 1,
            initially_select: ["tree-node-all"]
          },
          themes: {
            theme: "default",
            dots: false,
            icons: false
          },
          core: {
            animation: 0,
            initially_open: ["tree-node-all"]
          },
          unique: {
            error_callback: function(node, p, func) {
              return alert("A note has already that name: '" + node + "'");
            }
          }
        });
        this.searchField = $("#tree-search-field");
        this.searchButton = $("#tree-search");
        this.setListeners(callbacks);
      }

      Tree.prototype.setToolbar = function(navEl) {
        return navEl.prepend(require('../templates/tree_buttons'));
      };

      Tree.prototype.setListeners = function(callbacks) {
        var _this = this;
        $("#tree-create").click(function() {
          return _this.treeEl.jstree("create");
        });
        $("#tree-rename").click(function() {
          return _this.treeEl.jstree("rename");
        });
        $("#tree-remove").click(function() {
          return _this.treeEl.jstree("remove");
        });
        this.searchButton.click(this._onSearchClicked);
        this.searchField.keyup(this._onSearchChanged);
        this.widget.bind("create.jstree", function(e, data) {
          var idPath, nodeName, parent, path;
          nodeName = data.inst.get_text(data.rslt.obj);
          parent = data.rslt.parent;
          path = _this._getPath(parent, nodeName);
          path.pop();
          idPath = "tree-node" + (_this._getPath(parent, nodeName).join("-"));
          data.rslt.obj.attr("id", idPath);
          return callbacks.onCreate(path.join("/"), data.rslt.name, data);
        });
        this.widget.bind("rename.jstree", function(e, data) {
          var idPath, nodeName, parent, path;
          nodeName = data.inst.get_text(data.rslt.obj);
          parent = data.inst._get_parent(data.rslt.parent);
          path = _this._getStringPath(parent, data.rslt.old_name);
          if (path === "all") {
            return $.jstree.rollback(data.rlbk);
          } else if (data.rslt.old_name !== data.rslt.new_name) {
            idPath = "tree-node" + (_this._getPath(parent, nodeName).join("-"));
            data.rslt.obj.attr("id", idPath);
            _this.rebuildIds(data, data.rslt.obj, idPath);
            return callbacks.onRename(path, data.rslt.new_name, data);
          }
        });
        this.widget.bind("remove.jstree", function(e, data) {
          var nodeName, parent, path;
          nodeName = data.inst.get_text(data.rslt.obj);
          parent = data.rslt.parent;
          path = _this._getStringPath(parent, nodeName);
          if (path === "all") {
            return $.jstree.rollback(data.rlbk);
          } else {
            return callbacks.onRemove(path);
          }
        });
        this.widget.bind("select_node.jstree", function(e, data) {
          var nodeName, parent, path;
          nodeName = data.inst.get_text(data.rslt.obj);
          parent = data.inst._get_parent(data.rslt.parent);
          path = _this._getStringPath(parent, nodeName);
          return callbacks.onSelect(path, data.rslt.obj.data("id"));
        });
        this.widget.bind("move_node.jstree", function(e, data) {
          var newPath, nodeName, oldParent, oldPath, parent;
          nodeName = data.inst.get_text(data.rslt.o);
          parent = data.inst._get_parent(data.rslt.o);
          newPath = _this._getPath(parent, nodeName);
          newPath.pop();
          oldParent = data.inst.get_text(data.rslt.op);
          parent = data.inst._get_parent(data.rslt.op);
          oldPath = _this._getPath(parent, oldParent);
          oldPath.push(slugify(nodeName));
          if (newPath.length === 0) {
            return $.jstree.rollback(data.rlbk);
          } else {
            return callbacks.onDrop(newPath.join("/"), oldPath.join("/"), nodeName, data);
          }
        });
        return this.widget.bind("loaded.jstree", function(e, data) {
          return callbacks.onLoaded();
        });
      };

      Tree.prototype.rebuildIds = function(data, obj, idPath) {
        var child, newIdPath, _i, _len, _ref, _results;
        _ref = data.inst._get_children(obj);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          child = _ref[_i];
          newIdPath = idPath + "-" + slugify($(child).children("a:eq(0)").text());
          $(child).attr("id", newIdPath);
          _results.push(this.rebuildIds(data, child, newIdPath));
        }
        return _results;
      };

      Tree.prototype.selectNode = function(path) {
        var node, nodePath, tree;
        nodePath = path.replace(/\//g, "-");
        node = $("#tree-node-" + nodePath);
        tree = $("#tree").jstree("deselect_all", null);
        return tree = $("#tree").jstree("select_node", node);
      };

      Tree.prototype._getPath = function(parent, nodeName) {
        var name, nodes;
        if (nodeName != null) nodes = [slugify(nodeName)];
        name = "all";
        while (name && parent !== void 0 && parent.children !== void 0) {
          name = parent.children("a:eq(0)").text();
          nodes.unshift(slugify(name));
          parent = parent.parent().parent();
        }
        return nodes;
      };

      Tree.prototype._getStringPath = function(parent, nodeName) {
        return this._getPath(parent, nodeName).join("/");
      };

      Tree.prototype._convertData = function(data) {
        var tree;
        tree = {
          data: {
            data: "all",
            attr: {
              id: "tree-node-all",
              rel: "root"
            },
            children: []
          }
        };
        this._convertNode(tree.data, data.all, "-all");
        if (tree.data.length === 0) tree.data = "loading...";
        return tree;
      };

      Tree.prototype._convertNode = function(parentNode, nodeToConvert, idpath) {
        var newNode, nodeIdPath, property, _results;
        _results = [];
        for (property in nodeToConvert) {
          if (!(property !== "name" && property !== "id")) continue;
          nodeIdPath = "" + idpath + "-" + (property.replace(/_/g, "-"));
          newNode = {
            data: nodeToConvert[property].name,
            metadata: {
              id: nodeToConvert[property].id
            },
            attr: {
              id: "tree-node" + nodeIdPath,
              rel: "default"
            },
            children: []
          };
          if (parentNode.children === void 0) {
            parentNode.data.push(newNode);
          } else {
            parentNode.children.push(newNode);
          }
          _results.push(this._convertNode(newNode, nodeToConvert[property], nodeIdPath));
        }
        return _results;
      };

      Tree.prototype._onSearchClicked = function(event) {
        if (this.searchField.is(":hidden")) {
          this.searchField.show();
          this.searchField.focus();
          return this.searchButton.addClass("button-active");
        } else {
          this.searchField.hide();
          return this.searchButton.removeClass("button-active");
        }
      };

      Tree.prototype._onSearchChanged = function(event) {
        var searchString;
        searchString = this.searchField.val();
        return this.treeEl.jstree("search", searchString);
      };

      return Tree;

    })();

  }).call(this);
  
}});

