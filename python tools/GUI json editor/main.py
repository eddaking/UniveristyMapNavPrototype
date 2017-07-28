#this is in python 3, try that first if things dont work
from tkinter import *
from tkinter.filedialog import askopenfilename
import os

class Home:
	def __init__(self, master):

		frame = Frame(master)
		frame.pack()

		#just ewwww
		self.file_select = Button(frame, text="Select File", command=lambda: self.selectFile(master))
		self.file_select.pack(side=LEFT)
		
		self.button = Button(
			frame, text="QUIT", fg="red", command=frame.quit
		)
		self.button.pack(side=LEFT)
		
	def selectFile(self, master):
		#get the current dir of the script and make that the file dialog init loc
		dir_path = os.path.dirname(os.path.realpath(__file__))
		filename = askopenfilename(initialdir=dir_path)
		if (filename):
			Label(master, text=str(filename)).pack()
			data = loadFile(filename);
			Label(master, text=data).pack()

def loadFile(fileLoc):
	with open(fileLoc) as f:
		read_data =f.read()
	return read_data
	
root = Tk()
app = Home(root)
root.mainloop()