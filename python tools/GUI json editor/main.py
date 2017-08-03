#this is in python 3, try that first if things dont work
from tkinter import *
from tkinter.filedialog import askopenfilename
from scrframe import VerticalScrolledFrame
import os
import json
import pprint

#class for main display
class Home:

	#constructor
	def __init__(self, master, dataManager):
		
		self.dataManager = dataManager
		
		#create frame for holding buttons
		frame = Frame(master)
		frame.pack()
		
		#create button for selecting a file
		self.file_select = Button(frame, text="Select File", command=lambda: self.selectFile(master))
		self.file_select.pack(side=LEFT)
		
		#create button for quitting the application
		self.button = Button(frame, text="QUIT", fg="red", command=frame.quit)
		self.button.pack(side=LEFT)
		
	#method handling click on selectFile - param specifying parent of display.
	def selectFile(self, master):
		#load file
		data = self.dataManager.loadFile()
		#if loading succeeded []=false, [1]=true
		if (data):
			#
			tableFrame = Frame(master)
			tableFrame.pack(side=LEFT, fill=BOTH, expand=TRUE)
			
			#TODO: fix scrolling for diff OSs
			#ref: https://stackoverflow.com/questions/17355902/python-tkinter-binding-mousewheel-to-scrollbar
			scrFrame = VerticalScrolledFrame(tableFrame)
			scrFrame.pack(side=TOP, fill=BOTH, expand=TRUE)
			
			dataFrame = Frame(scrFrame.interior, bg = "#000000")
			
			#draw headers
			keys = self.__getHeaders(data)
			self.addGridRow(dataFrame, 0, keys);
			
			#draw table row by row
			rowNo = 1
			for row in data:
				obj = row.getData()
				fProp = obj['properties']
				#put the data to be displayed in this array
				displayData = [fProp['id'], fProp['Label'], fProp['LinkedTo']]
				#TODO:stop catching blank level - abstractify and remove
				#potentially move into dataManager
				if 'Level' in fProp:
					displayData.append(fProp['Level'])
				else:
					displayData.append(-1)
				row.addGridRow(dataFrame, rowNo, displayData)
				rowNo = rowNo + 1
			dataFrame.pack()
	
	def addGridRow(self, grid, row, data):
		i = 0
		for elem in data:
			elemFrame = Frame(grid)
			Label(elemFrame, text=elem).pack(side="left")
			elemFrame.grid(sticky="W"+"E", pady = 1,padx = 1, row = row, column = i)
			i = i + 1
	
	#method for returning all headers in the properties field
	def __getHeaders(self, allRows):
		keys = []
		for row in allRows:
			for key, value in row.getData()['properties'].items():
				if key not in keys:
					keys.append(key)
		keys.append('Edit?')
		keys.append('Delete?')
		return keys

#class representing each row of data in the display
#contains both data and gui references
class DataRow:

	#constructor
	def __init__(self, dm, data, index):
		self.dm = dm
		self.data = data
		self.index = index
		
	#method for creating GUI elements
	#probs shouldnt need 'text' 
	#TODO: sort that out
	def addGridRow(self, grid, row, text):
		self.row = row
		self.parent = grid
		LabelsAndFrames = []
		i = 0
		for elem in text:
			LabelsAndFrames.append(self.__attachLabelToFrame(i, elem))
			i = i + 1
		LabelsAndFrames.append(self.__attachButtonToFrame(i, "Edit", lambda: self.__edit()))
		LabelsAndFrames.append(self.__attachButtonToFrame(i + 1, "Delete", lambda: self.__del()))
		self.LabelsAndFrames = LabelsAndFrames
	
	#method to create a label and attach it to the parent in the correct grid ref
	def __attachLabelToFrame(self, col, text):
		elemFrame = Frame(self.parent)
		l = Label(elemFrame, text=text)
		l.pack(side="left")
		elemFrame.grid(sticky="W"+"E", pady = 1, padx = 1, row = self.row, column = col)
		return [elemFrame, l]
	
	#method to create a button and attach it to the parent in the correct grid ref
	def __attachButtonToFrame(self, col, text, lmda):
		elemFrame = Frame(self.parent)
		b = Button(elemFrame, text=text, command=lmda, bd = 0, bg = "#E1E1E1", relief = "solid")
		b.pack()
		elemFrame.grid(sticky="W"+"E", padx = 1, row = self.row, column = col)
		return [elemFrame, b]
	
	#method for event of 'edit' button click
	def __edit(self):
		self.LabelsAndFrames[0][1]['text'] = "Test"
		self.edit = DataInputBox(lambda: self.__test())
		print("TODO: implement editing")
	
	def __test(self):
		print("success")
	
	#method for event 'delete' button click
	def __del(self):
		for label in self.LabelsAndFrames:
			label[0].destroy()
		self.dm.delRec(self.index)
		self.data = {}
	
	#method for getting data obj
	#currently unused
	#also can be bypassed with dm.data
	def getData(self):
		return self.data

#class for handling data import, export and control
class DataManager:
	
	#methods TODO:
	#saveFile(self)
	
	#constructor
	def __init__(self, schemaLoc):
		self.changed = False
		self.allData = []
		self.schema = self.__loadSchema(schemaLoc)
	
	#method returning a bool specifiying if the data has been changed
	def isChanged(self):
		return self.changed
		
	#method for loading files
	def loadFile(self):
		#get the current dir of the script and make that the file dialog init loc
		dir_path = os.path.dirname(os.path.realpath(__file__))
		#TODO: undo this
		filename = 'C:\\Users\\emk1n17\\Documents\\LocalGit\\UniveristyMapNavPrototype\\testNodes.json'
		#filename = askopenfilename(initialdir=dir_path)
		#if file selected - load it
		if (filename):
			with open(filename) as f:
				readFile = json.load(f)
			#for each feature (data point) create a row obj
			for feature in readFile['features']:
				if ',' in feature['properties']['Label']:
					print(feature)
				self.allData.append(DataRow(self, feature, len(self.allData)))
		return self.allData
	
	#method for deleting an element from the data
	def delRec(self, index):
		print(len(self.allData))
		self.allData.pop(index)
		self.changed = True
		print(len(self.allData))
	
	#method for updating an element from the data
	def updateRec(self, index, propList):
		#TODO:the actual updating
		self.changed = True
	
	#method for adding a new element to the data
	def addRec(self, row):
		self.allData.append(row)
		self.changed = True
	
	#method to load the schema from file into a dict
	def __loadSchema(self, schemaLoc):
	
		#read the file
		with open(schemaLoc) as f:
			s = f.read()
		
		#split the file into lines
		schemaArray = s.split('\n')
		
		#create the schema obj
		schemaObj = {}
		#array showing the current indexes we are working at
		currIndexes = []
		
		#for each line in the schema, check how many tabs are at the front of the line
		for line in schemaArray:
			line = line.rstrip()
			
			#if there are fewer tabs than indexes, then we have moved up a level in the dictionary, so remove the last index
			if (line.count('\t') < len(currIndexes)):
				currIndexes.pop()
				
			#if there are more tabs than items in the schema, then the schema is broken
			elif (line.count('\t') > len(currIndexes)):
				print("You may have broken the Schema")
			
			line = line.strip()
			
			#if the final char in the line is a :, then we have to add a new level to the dict
			if (line[-1] == ":"):
				self.__addToSchema(schemaObj, currIndexes, line[:-1], {})
				currIndexes.append(line[:-1])
				
			#if not then we are adding a property to the indexed dict
			else:
				#only split on the first :
				property = line.split(':',1)
				self.__addToSchema(schemaObj, currIndexes, property[0].strip(), property[1].strip())
		print(schemaObj)
		#TODO: get keys from schema obj in a recusive manner into an array (ignore keys linked to other dicts)
		for key in schemaObj:
			print(key)
		
	#method for recursively adding new items to the schema object
	def __addToSchema(self, obj, indexes, property, val = {}):
	
		#if there are indexes, then we need to traverse the dict to the sepcified loc
		if (indexes):
		
			#split the indexes array into the top element and the rest
			restIndex = indexes.copy()
			topIndex = restIndex.pop(0)
			
			#update the dict referenced, with the result of the recusive call
			obj[topIndex].update(self.__addToSchema(obj[topIndex], restIndex, property, val))
			return obj
		
		#if no indexes, then just add the property/val to the dict at this level
		obj[property] = val
		return obj
		
	def getAllRows(self):
		return self.allData

#a class manging data input
class DataInputBox:
	#constructor
	def __init__(self, lmda, data = {}):
		self.top = top = Toplevel()
		rows = []
		self.rowNo = 0
		rows.append(self.__createRow("id",top))
		self.rowNo += 1
		
		Button(top, text="test", command=lmda).grid(row = self.rowNo, sticky="W"+"E")
	
	#method for creating a row in the input dialog
	def __createRow(self, labelText, parent):
		row = Frame(parent)
		Label(row, text=labelText).pack(side="left")
		Entry(row).pack(side="left", fill=BOTH, expand=TRUE)
		row.grid(row = self.rowNo, sticky="W"+"E")
		return row
root = Tk()
#my_window.grab_set()
#self.grab_release()
#self.top = tki.Toplevel()

dm = DataManager(os.path.dirname(os.path.realpath(__file__))+"\schema.txt")
app = Home(root, dm)
root.mainloop()
