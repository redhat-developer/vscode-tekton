package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
)

// Snippet represents a VS Code snippet.
type Snippet struct {
	Prefix      string   `json:"prefix"`
	Body        []string `json:"body"`
	Description string   `json:"description"`
}

var snippets = map[string]Snippet{
	"Resource Limits and Requests": {
		Prefix:      "Tekton: K8s Limits",
		Body:        load("k8s-limits.yaml"),
		Description: "Defines the Kubernetes resource limits and requests",
	},
	"Task": {
		Prefix:      "Tekton: Task",
		Body:        load("task.yaml"),
		Description: "Create a Tekton Task Resource",
	},
	"TaskRun": {
		Prefix:      "Tekton: TaskRun",
		Description: "Create a Tekton TaskRun Resource",
		Body:        load("taskrun.yaml"),
	},
	"Pipeline": {
		Prefix:      "Tekton: Pipeline",
		Description: "Create a Tekton Pipeline Resource",
		Body:        load("pipeline.yaml"),
	},
	"PipelineRun": {
		Prefix:      "Tekton: PipelineRun",
		Description: "Create a Tekton PipelineRun Resource",
		Body:        load("pipelinerun.yaml"),
	},
	"ClusterTask": {
		Prefix:      "Tekton: ClusterTask",
		Description: "Create a ClusterTask Resource",
		Body:        load("clustertask.yaml"),
	},
	"PipelineResource": {
		Prefix:      "Tekton: PipelineResource",
		Description: "Create a PipelineResource Resource",
		Body:        load("pipelineResource.yaml"),
	},
	"PipelineResource Type": {
		Prefix:      "Tekton: PipelineResourceType",
		Description: "Create a PipelineResource Type Resource",
		Body:        load("pipelineResourceType.yaml"),
	},
	"Pipeline Task Reference": {
		Prefix:      "Tekton: PipelineTaskReference",
		Description: "Tekton Pipeline Task Reference",
		Body:        load("pipelineTaskReference.yaml"),
	},
	"Pipeline Task Reference Input": {
		Prefix:      "Tekton: PipelineTaskReferenceInput",
		Description: "Tekton Pipeline Task Reference Inputs, Parameters and Outputs",
		Body:        load("pipelineTaskReferenceInputs.yaml"),
	},
	"TaskStep": {
		Prefix:      "Tekton TaskStep",
		Description: "Tekton Task Step",
		Body:        load("tektonTaskStep.yaml"),
	},
	"Param": {
		Prefix:      "Tekton: Parameter",
		Description: "A generic parameter used across any YAML that are key/value pair",
		Body:        load("tektonParameter.yaml"),
	},
	"Task Input": {
		Prefix:      "Tekton: TaskInput",
		Description: "Tekton Task Inputs, Parameters and Outputs",
		Body:        load("taskinput.yaml"),
	},
	"Task Param": {
		Prefix:      "Tekton: TaskParameter",
		Description: "Tekton Pipeline Task Parameter",
		Body:        load("tektonTaskParameter.yaml"),
	},
}

func load(loc string) []string {
	loc = filepath.Join("rawsnippets", loc)
	f, err := os.Open(loc)
	if err != nil {
		panic(err)
	}
	defer f.Close()

	r := bufio.NewScanner(f)
	lines := []string{}
	for r.Scan() {
		l := r.Text()
		if err := r.Err(); err != nil {
			panic(err)
		}
		lines = append(lines, l)
	}

	return lines
}

func main() {
	os.RemoveAll("snippets")
	out, err := json.MarshalIndent(snippets, "", "  ")
	if err != nil {
		panic(err)
	}
	err = os.Mkdir("snippets", 0744)
	if err != nil {
		log.Fatalf("Unable to create folder: %s", err)
	}
	err = ioutil.WriteFile("snippets/tektoncd.json", out, 0644)
	if err != nil {
		log.Fatalf("Unable to create json file: %s", err)

	}
	fmt.Printf("%s", out)
}
