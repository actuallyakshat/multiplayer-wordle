package main

import (
	"fmt"
	"net/http"
	"sync"
)

func main() {
	//add a valid url here
	url := "http://localhost:8080/game/16"
	var wg sync.WaitGroup

	for i := 0; i < 200; i++ {
		wg.Add(1)
		go func(num int) {
			defer wg.Done()
			resp, err := http.Get(url)
			if err != nil {
				fmt.Printf("Request %d failed: %v\n", num, err)
				return
			}
			defer resp.Body.Close()
			fmt.Printf("Request %d - Status: %s\n", num, resp.Status)
		}(i)
	}

	wg.Wait()
}
